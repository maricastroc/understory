import { describe, expect, it } from "vitest";
import { sampleLines } from "./eval-sample";

const source = ["const a = 1;", "", "}", "// note", "return a;", "   ", "export { a };"].join("\n");

describe("sampleLines", () => {
  it("draws the same lines for the same key and skips lines with no letter or digit", () => {
    const first = sampleLines(source, "owner/repo:file.ts", 2);
    expect(sampleLines(source, "owner/repo:file.ts", 2)).toEqual(first);
    expect(first).toHaveLength(2);
    for (const line of first) expect([1, 4, 5, 7]).toContain(line);
  });

  it("returns every eligible line, in order, when asked for more than there are", () => {
    expect(sampleLines(source, "any", 10)).toEqual([1, 4, 5, 7]);
  });
});
