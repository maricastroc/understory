import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithTokens } from "../token-context";
import { graphqlResult, rest } from "./client";

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
