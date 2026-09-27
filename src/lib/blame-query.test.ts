import { describe, expect, it } from "vitest";
import { parseBlameQuery } from "./blame-query";

const SHA = "92f6a3f".padEnd(40, "0");
const q = (params: Record<string, string>) => parseBlameQuery(new URLSearchParams(params));

describe("parseBlameQuery", () => {
  it("accepts a pinned window", () => {
    expect(q({ repo: "o/r", path: "src/a.ts", ref: SHA, start: "1", end: "30" })).toEqual({
      repo: "o/r",
      path: "src/a.ts",
      ref: SHA,
      start: 1,
      end: 30,
    });
  });

  it("requires a commit sha — blame is never served for a moving branch", () => {
    expect(q({ repo: "o/r", path: "a.ts", start: "1", end: "2" })).toEqual({
      error: "ref is required — blame is only served for a pinned commit",
    });
    expect(q({ repo: "o/r", path: "a.ts", ref: "main", start: "1", end: "2" })).toEqual({
      error: "ref must be a commit sha",
    });
    expect(q({ repo: "o/r", path: "a.ts", ref: "--all", start: "1", end: "2" })).toEqual({
      error: "ref must be a commit sha",
    });
  });

  it("rejects missing repo or path", () => {
    expect(q({ path: "a.ts", ref: SHA, start: "1", end: "2" })).toHaveProperty("error");
    expect(q({ repo: "o/r", ref: SHA, start: "1", end: "2" })).toHaveProperty("error");
  });

  it("rejects malformed, inverted and oversized windows", () => {
    for (const [start, end] of [
      ["0", "2"],
      ["-1", "2"],
      ["1.5", "2"],
      ["a", "2"],
      ["5", "4"],
      ["1", "401"],
    ]) {
      expect(q({ repo: "o/r", path: "a.ts", ref: SHA, start, end })).toHaveProperty("error");
    }
    expect(q({ repo: "o/r", path: "a.ts", ref: SHA, start: "1", end: "400" })).not.toHaveProperty(
      "error",
    );
  });
});
