import { afterEach, describe, expect, it, vi } from "vitest";
import { rest } from "@understory/core/collect/github/client";
import { glRest } from "@understory/core/collect/gitlab/client";
import { failureFrom, NETWORK_FAILURE, providerFailure, thrownFailure } from "./api-error";

async function thrownBy(call: () => Promise<unknown>, status: number): Promise<string> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status })),
  );
  try {
    await call();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected a failure");
}

afterEach(() => vi.unstubAllGlobals());

describe("providerFailure, read from the errors core really throws", () => {
  it("tells a missing GitHub repository from a rate limit and a server fault", async () => {
    const github = (status: number) => thrownBy(() => rest("/repos/acme/x"), status);
    expect(providerFailure(await github(404))).toEqual({ code: "not-found", host: "GitHub" });
    expect(providerFailure(await github(403))).toEqual({ code: "rate-limited", host: "GitHub" });
    expect(providerFailure(await github(429))).toEqual({ code: "rate-limited", host: "GitHub" });
    expect(providerFailure(await github(502))).toEqual({ code: "server", host: "GitHub" });
    expect(providerFailure(await github(422))).toEqual({ code: "failed", host: "GitHub" });
  });

  it("reads GitLab's refusals as a project it cannot see", async () => {
    const gitlab = (status: number) => thrownBy(() => glRest("gitlab.com", "/projects/1"), status);
    expect(providerFailure(await gitlab(401))).toEqual({ code: "not-found", host: "GitLab" });
    expect(providerFailure(await gitlab(403))).toEqual({ code: "not-found", host: "GitLab" });
    expect(providerFailure(await gitlab(404))).toEqual({ code: "not-found", host: "GitLab" });
    expect(providerFailure(await gitlab(429))).toEqual({ code: "rate-limited", host: "GitLab" });
  });

  it("knows a local path that is not a repository, and leaves the rest as failed", () => {
    expect(providerFailure("Not a git repository: ./nowhere")).toEqual({
      code: "not-a-repository",
    });
    expect(providerFailure("Bad location")).toEqual({ code: "failed" });
  });
});

describe("failureFrom", () => {
  it("keeps the server's code, host, install link and its original text as the detail", () => {
    const res = new Response(null, { status: 400 });
    expect(
      failureFrom(res, {
        error: "GitHub API 404 — not found. If acme/x is private, install: https://app",
        detail: "GitHub API 404 — not found",
        code: "not-found",
        host: "GitHub",
        installUrl: "https://app",
      }),
    ).toEqual({
      code: "not-found",
      detail: "GitHub API 404 — not found",
      host: "GitHub",
      installUrl: "https://app",
    });
  });

  it("falls back on the status when the body has no code it knows", () => {
    expect(
      failureFrom(new Response(null, { status: 400 }), { error: "nope", code: "odd" }),
    ).toEqual({ code: "failed", detail: "nope" });
    expect(failureFrom(new Response(null, { status: 504 }), null)).toEqual({
      code: "server",
      detail: "HTTP 504",
    });
    expect(
      failureFrom(new Response(null, { status: 429, headers: { "Retry-After": "20" } }), {
        error: "Rate limit exceeded",
        code: "busy",
      }),
    ).toEqual({ code: "busy", detail: "Rate limit exceeded", retryAfter: 20 });
  });

  it("ignores a host it does not know", () => {
    const res = new Response(null, { status: 400 });
    expect(failureFrom(res, { code: "rate-limited", host: "Bitbucket" })).toEqual({
      code: "rate-limited",
      detail: null,
    });
  });
});

describe("thrownFailure", () => {
  it("keeps what was thrown as the detail of a failure", () => {
    expect(thrownFailure(new Error("Unexpected token <"))).toEqual({
      code: "failed",
      detail: "Unexpected token <",
    });
    expect(NETWORK_FAILURE).toEqual({ code: "network", detail: null });
  });
});
