import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { syntheticRetryCap } from "../line-investigation/fixtures/synthetic-retry-cap";
import { useInvestigation } from "./use-investigation";

const FORM = {
  repoPath: "synthetic/payments-service",
  location: "src/billing/charge.ts:9",
  question: "Why exactly 3 retries?",
};

type Route = (init?: RequestInit) => Promise<Response>;

function stubFetch(dig: Route) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/investigations") {
      return Response.json({ investigations: [], persisted: false });
    }
    if (url === "/api/dig") return dig(init);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function ndjson() {
  let push: (line: object) => void = () => {};
  let end: () => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      push = (line) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      end = () => controller.close();
    },
  });
  const response = new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
  return { response, push: (line: object) => push(line), end: () => end() };
}

async function mounted() {
  const hook = renderHook(() => useInvestigation(null));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

afterEach(() => vi.unstubAllGlobals());

describe("useInvestigation — a line case before its evidence arrives", () => {
  it("shows a draft while collecting and hands its key to the case that replaces it", async () => {
    const stream = ndjson();
    stubFetch(async () => stream.response);
    const { result } = await mounted();

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.investigate(FORM);
    });
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    const key = result.current.draft!.key;
    expect(result.current.draft).toMatchObject({ form: FORM, error: null });
    expect(result.current.view).toBe("case");
    expect(result.current.current).toBeNull();

    await act(async () => {
      stream.push({ phase: "evidence", evidence: syntheticRetryCap.evidence });
    });
    await waitFor(() => expect(result.current.current?.pending).toBe(true));
    expect(result.current.draft).toBeNull();
    expect(result.current.current?.mountKey).toBe(key);

    await act(async () => {
      stream.push({ phase: "final", narrative: syntheticRetryCap.narrative });
      stream.end();
      await done;
    });
    expect(result.current.current?.pending).toBe(false);
    expect(result.current.current?.mountKey).toBe(key);
    expect(result.current.current?.result.narrative).not.toBeNull();
  });

  it("keeps the draft with the error in place and retries under the same key", async () => {
    const fetch = stubFetch(async () =>
      Response.json({ error: "Request failed" }, { status: 502 }),
    );
    const { result } = await mounted();

    await act(async () => {
      await result.current.investigate(FORM);
    });
    expect(result.current.draft).toMatchObject({ error: "Request failed", form: FORM });
    expect(result.current.error).toBeNull();
    expect(result.current.view).toBe("case");
    const key = result.current.draft!.key;

    await act(async () => {
      result.current.retryDraft();
    });
    await waitFor(() => expect(fetch.mock.calls.filter(([u]) => u === "/api/dig")).toHaveLength(2));
    expect(result.current.draft?.key).toBe(key);

    act(() => result.current.backToCode());
    expect(result.current.draft).toBeNull();
    expect(result.current.view).toBe("browse");
  });

  it("leaves drill-downs on the old path: no draft, error back in the composer", async () => {
    stubFetch(async () => Response.json({ error: "Not found" }, { status: 404 }));
    const { result } = await mounted();

    await act(async () => {
      await result.current.drillInto(
        "GI-2049",
        "Why?",
        { kind: "pull_request", id: "pr:812" },
        FORM.repoPath,
      );
    });
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toBe("Not found");
    expect(result.current.view).toBe("browse");
  });
});
