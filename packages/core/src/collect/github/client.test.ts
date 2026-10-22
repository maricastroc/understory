import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithTokens } from "../token-context";
import { GitHubApiError, graphqlResult, rest, restRaw } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function github(answer: (n: number, signal?: AbortSignal) => Response | Promise<Response>) {
  const calls: Array<RequestInit | undefined> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init);
      return answer(calls.length, init?.signal ?? undefined);
    }),
  );
  return calls;
}

const hang = (signal?: AbortSignal) =>
  new Promise<Response>((_, reject) =>
    signal?.addEventListener("abort", () =>
      reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
    ),
  );

afterEach(() => vi.unstubAllGlobals());

describe("rest", () => {
  it("sends the request as before when no signal is given, and with it when one is", async () => {
    const calls = github(() => json({ ok: true }));
    await rest("/x");
    expect(calls[0]).not.toHaveProperty("signal");
    const ctrl = new AbortController();
    await rest("/x", { signal: ctrl.signal });
    expect(calls[1]?.signal).toBe(ctrl.signal);
  });
});

const failing = (status: number, headers: Record<string, string> = {}) =>
  new Response("{}", { status, headers });

async function thrown(call: () => Promise<unknown>): Promise<GitHubApiError> {
  try {
    await call();
  } catch (e) {
    expect(e).toBeInstanceOf(GitHubApiError);
    return e as GitHubApiError;
  }
  throw new Error("expected GitHub to refuse");
}

describe("a refused request", () => {
  it("is a rate limit when GitHub says no requests are left", async () => {
    github(() => failing(403, { "x-ratelimit-remaining": "0", "x-ratelimit-limit": "60" }));
    const e = await thrown(() => rest("/repos/acme/x"));
    expect([e.status, e.rateLimited]).toEqual([403, true]);
    expect(e.message).toBe(
      "GitHub API 403 — rate limited; set GITHUB_TOKEN in .env.local for higher limits",
    );
  });

  it("is a rate limit when GitHub asks to retry later, as with a secondary limit", async () => {
    github(() => failing(403, { "retry-after": "60" }));
    expect((await thrown(() => rest("/repos/acme/x"))).rateLimited).toBe(true);
  });

  it("is not called a rate limit when GitHub gives no sign of one", async () => {
    github(() => failing(403, { "x-ratelimit-remaining": "4999" }));
    const e = await thrown(() => rest("/repos/acme/x"));
    expect([e.status, e.rateLimited]).toEqual([403, false]);
    expect(e.message).toBe(
      "GitHub API 403 — refused; check that the token can read this repository",
    );
    expect(e.message).not.toContain("rate limited");
  });

  it("keeps the messages a 429 and a 404 always had", async () => {
    github(() => failing(429));
    expect((await thrown(() => rest("/x"))).message).toBe(
      "GitHub API 429 — rate limited; set GITHUB_TOKEN in .env.local for higher limits",
    );
    github(() => failing(404));
    const missing = await thrown(() => restRaw("/x"));
    expect([missing.rateLimited, missing.message]).toEqual([
      false,
      "GitHub API 404 — not found; is the repo public, or is GITHUB_TOKEN set for private access?",
    ]);
  });

  it("reads the same signals on GraphQL", async () => {
    github(() => failing(403, { "x-ratelimit-remaining": "0" }));
    const limited = await thrown(() =>
      runWithTokens({ github: "t" }, () => graphqlResult("query", {})),
    );
    expect([limited.message.startsWith("GitHub GraphQL 403"), limited.rateLimited]).toEqual([
      true,
      true,
    ]);
    github(() => failing(403));
    const refused = await thrown(() =>
      runWithTokens({ github: "t" }, () => graphqlResult("query", {})),
    );
    expect(refused.rateLimited).toBe(false);
  });
});

describe("graphqlResult", () => {
  it("still retries a server error when no signal and no attempts are given", async () => {
    const calls = github((n) => (n === 1 ? json({}, 502) : json({ data: { ok: 1 } })));
    const out = await runWithTokens({ github: "t" }, () => graphqlResult("query", {}));
    expect(out.data).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
  });

  it("stops at once, without retrying, when the caller's signal aborts the request in flight", async () => {
    const ctrl = new AbortController();
    const calls = github((_n, signal) => hang(signal));
    const asking = runWithTokens({ github: "t" }, () =>
      graphqlResult("query", {}, { signal: ctrl.signal }),
    );
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    ctrl.abort();
    await expect(asking).rejects.toThrow("GitHub GraphQL cancelled");
    await new Promise((r) => setTimeout(r, 450));
    expect(calls).toHaveLength(1);
  });

  it("sends nothing when the caller's signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const calls = github(() => json({ data: {} }));
    await expect(
      runWithTokens({ github: "t" }, () => graphqlResult("query", {}, { signal: ctrl.signal })),
    ).rejects.toThrow("GitHub GraphQL cancelled");
    expect(calls).toHaveLength(0);
  });

  it("makes one attempt only when asked to", async () => {
    const calls = github(() => json({}, 502));
    await expect(
      runWithTokens({ github: "t" }, () => graphqlResult("query", {}, { attempts: 1 })),
    ).rejects.toThrow("GitHub GraphQL 502");
    expect(calls).toHaveLength(1);
  });
});
