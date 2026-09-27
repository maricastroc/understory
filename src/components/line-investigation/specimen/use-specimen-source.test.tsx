import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpecimenSource } from "./use-specimen-source";

const SHA = "92f6a3f".padEnd(40, "0");

afterEach(() => vi.unstubAllGlobals());

function stub(ok: boolean, body: unknown) {
  const fn = vi.fn<(url: string) => Promise<unknown>>(async () => ({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("useSpecimenSource", () => {
  it("reads the file at the investigated revision", async () => {
    const fetch = stub(true, { content: "a\r\nb\n" });
    const { result } = renderHook(() => useSpecimenSource("o/r", "src/a.ts", SHA));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.lines).toEqual(["a", "b"]);
    expect(fetch.mock.calls[0][0]).toBe(`/api/file?repo=o%2Fr&path=src%2Fa.ts&ref=${SHA}`);
  });

  it("falls back to the current HEAD only when the case has no sha", async () => {
    const fetch = stub(true, { content: "x" });
    renderHook(() => useSpecimenSource("o/r", "a.ts", null));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][0]).toBe("/api/file?repo=o%2Fr&path=a.ts");
  });

  it("surfaces the API error", async () => {
    stub(false, { error: "Could not read a.ts" });
    const { result } = renderHook(() => useSpecimenSource("o/r", "a.ts", SHA));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Could not read a.ts");
  });
});
