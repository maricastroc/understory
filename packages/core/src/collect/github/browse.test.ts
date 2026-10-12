import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithTokens } from "../token-context";
import { commitFileChange } from "./browse";

function stub(body: unknown) {
  const fetched = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
    text: async () => "",
  }));
  vi.stubGlobal("fetch", fetched);
  return fetched;
}

const files = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    filename: `src/f${i}.ts`,
    patch: `@@ -1 +1 @@\n+f${i}`,
  }));

const change = () =>
  runWithTokens({ github: "t" }, () => commitFileChange("acme", "sync", "abc1234", "src/f1.ts"));

afterEach(() => vi.unstubAllGlobals());

describe("commitFileChange — the patch and the size of the commit, from one response", () => {
  it("gives the file's patch with how many files and lines the commit changed", async () => {
    const fetched = stub({ stats: { total: 14 }, files: files(2) });
    expect(await change()).toEqual({ patch: "@@ -1 +1 @@\n+f1", files: 2, lines: 14 });
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  it("leaves the size unknown when the response does not carry it", async () => {
    stub({ files: files(2) });
    expect(await change()).toMatchObject({ files: 2, lines: null });
    stub({ stats: { total: 14 } });
    expect(await change()).toEqual({ patch: null, files: null, lines: 14 });
  });

  it("does not count the files when the list may have been cut", async () => {
    stub({ stats: { total: 9000 }, files: files(300) });
    expect(await change()).toMatchObject({ files: null, lines: 9000 });
  });
});
