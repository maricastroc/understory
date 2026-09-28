import { describe, expect, it } from "vitest";
import { summarizeSpans, withLookups } from "./summarize";

const span = (startLine: number, endLine: number, sha: string, date: string) => ({
  startLine,
  endLine,
  sha,
  date,
});

describe("summarizeSpans", () => {
  it("gives one mark per blame commit, sized by the current lines it owns, newest first", () => {
    const s = summarizeSpans([
      span(1, 4, "a", "2021-06-18T00:00:00Z"),
      span(5, 5, "b", "2023-03-15T00:00:00Z"),
      span(6, 9, "a", "2021-06-18T00:00:00Z"),
    ]);
    expect(s.lineCount).toBe(9);
    expect(s.marks).toEqual([
      { sha: "b", at: "2023-03-15T00:00:00Z", lines: 1, prLookup: "skipped", boundary: false },
      { sha: "a", at: "2021-06-18T00:00:00Z", lines: 8, prLookup: "skipped", boundary: false },
    ]);
  });

  it("keeps unknown lookups unknown until a lookup settles them", () => {
    const s = summarizeSpans([span(1, 2, "a", "2021-01-01T00:00:00Z")]);
    expect(withLookups(s, new Map()).marks[0].prLookup).toBe("skipped");
    expect(withLookups(s, new Map([["a", "none" as const]])).marks[0].prLookup).toBe("none");
  });
});
