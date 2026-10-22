import { afterEach, describe, expect, it, vi } from "vitest";
import { graphqlResult, rest } from "@understory/core/collect/github/client";
import { glRest } from "@understory/core/collect/gitlab/client";
import { runWithTokens } from "@understory/core/collect/token-context";
import { providerFailure } from "./provider-failure";

async function thrownBy(
  call: () => Promise<unknown>,
  status: number,
  headers: Record<string, string> = {},
): Promise<unknown> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status, headers })),
  );
  try {
    await call();
  } catch (e) {
    return e;
  }
  throw new Error("expected a failure");
}

afterEach(() => vi.unstubAllGlobals());

const github = (status: number, headers?: Record<string, string>) =>
  thrownBy(() => rest("/repos/acme/x"), status, headers);

describe("providerFailure, read from the errors core really throws", () => {
  it("tells a missing GitHub repository from a rate limit and a server fault", async () => {
    expect(providerFailure(await github(404))).toEqual({ code: "not-found", host: "GitHub" });
    expect(providerFailure(await github(429))).toEqual({ code: "rate-limited", host: "GitHub" });
    expect(providerFailure(await github(502))).toEqual({ code: "server", host: "GitHub" });
    expect(providerFailure(await github(422))).toEqual({ code: "failed", host: "GitHub" });
  });

  it("calls a GitHub 403 a rate limit only when GitHub's headers say so", async () => {
    expect(providerFailure(await github(403, { "x-ratelimit-remaining": "0" }))).toEqual({
      code: "rate-limited",
      host: "GitHub",
    });
    expect(providerFailure(await github(403, { "retry-after": "60" }))).toEqual({
      code: "rate-limited",
      host: "GitHub",
    });
    expect(providerFailure(await github(403, { "x-ratelimit-remaining": "4999" }))).toEqual({
      code: "failed",
      host: "GitHub",
    });
  });

  it("reads the same answer from a GraphQL request", async () => {
    const limited = await thrownBy(
      () => runWithTokens({ github: "t" }, () => graphqlResult("query", {})),
      403,
      { "x-ratelimit-remaining": "0" },
    );
    expect(providerFailure(limited)).toEqual({ code: "rate-limited", host: "GitHub" });
  });

  it("leaves a 403 it only has as text unnamed", () => {
    expect(providerFailure(new Error("GitHub API 403 — rate limited"))).toEqual({
      code: "failed",
      host: "GitHub",
    });
  });

  it("reads GitLab's request for credentials as a project it cannot see", async () => {
    const gitlab = (status: number) => thrownBy(() => glRest("gitlab.com", "/projects/1"), status);
    expect(providerFailure(await gitlab(401))).toEqual({ code: "not-found", host: "GitLab" });
    expect(providerFailure(await gitlab(403))).toEqual({ code: "failed", host: "GitLab" });
    expect(providerFailure(await gitlab(404))).toEqual({ code: "not-found", host: "GitLab" });
    expect(providerFailure(await gitlab(429))).toEqual({ code: "rate-limited", host: "GitLab" });
  });

  it("knows a local path that is not a repository, and leaves the rest as failed", () => {
    expect(providerFailure(new Error("Not a git repository: ./nowhere"))).toEqual({
      code: "not-a-repository",
    });
    expect(providerFailure(new Error("Bad location"))).toEqual({ code: "failed" });
    expect(providerFailure("thrown as a string")).toEqual({ code: "failed" });
  });
});
