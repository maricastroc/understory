import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWindowBlame } from "./use-window-blame";

const SHA = "92f6a3f".padEnd(40, "0");
const SPAN = {
  startLine: 1,
  endLine: 3,
  sha: SHA,
  shortSha: "92f6a3f",
  date: "2023-03-15T00:00:00Z",
};

function stubFetch(handler: (url: string) => { ok: boolean; status?: number; body: unknown }) {
  const fn = vi.fn(async (url: string) => {
    const r = handler(url);
    return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 404), json: async () => r.body };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("useWindowBlame", () => {
  it("never asks for blame without a pinned sha", () => {
    const fetch = stubFetch(() => ({ ok: true, body: { spans: [] } }));
    const { result } = renderHook(() => useWindowBlame("o/r", "a.ts", null, { start: 1, end: 3 }));
    expect(result.current).toEqual({ status: "unpinned", spans: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requests exactly the pinned window and returns its spans", async () => {
    const fetch = stubFetch(() => ({ ok: true, body: { spans: [SPAN] } }));
    const { result } = renderHook(() => useWindowBlame("o/r", "a.ts", SHA, { start: 1, end: 3 }));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.spans).toEqual([SPAN]);
    expect(fetch.mock.calls[0][0]).toBe(`/api/blame?repo=o%2Fr&path=a.ts&ref=${SHA}&start=1&end=3`);
  });

  it("reports unavailable instead of inventing bars when the API fails", async () => {
    stubFetch(() => ({ ok: false, status: 404, body: { error: "nope" } }));
    const { result } = renderHook(() => useWindowBlame("o/r", "a.ts", SHA, { start: 1, end: 3 }));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.spans).toBeNull();
  });

  it("keeps spans for the same revision while a new window loads", async () => {
    stubFetch(() => ({ ok: true, body: { spans: [SPAN] } }));
    const { result, rerender } = renderHook(
      ({ end }) => useWindowBlame("o/r", "a.ts", SHA, { start: 1, end }),
      { initialProps: { end: 3 } },
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ end: 24 });
    expect(result.current).toEqual({ status: "loading", spans: [SPAN] });
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});
