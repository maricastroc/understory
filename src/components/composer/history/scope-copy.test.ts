import { describe, expect, it } from "vitest";
import { syntheticOverview } from "../fixtures/synthetic-overview";
import { headLabel } from "./head-label";
import { mappedLine, scopeLine, whyShown } from "./scope-copy";

describe("scope copy", () => {
  it("says which files are shown, why, and that they are not a sample", () => {
    expect(scopeLine(syntheticOverview)).toBe(
      "14 of 1,284 files: 12 changed in the last 12 commits, 2 with your cases. Not a sample of the whole repository.",
    );
  });

  it("marks a truncated tree total as a lower bound and counts path picks", () => {
    const files = syntheticOverview.files.map((f, i) =>
      i === 3 ? { ...f, reason: "path" as const } : f,
    );
    expect(scopeLine({ ...syntheticOverview, files, truncated: true })).toBe(
      "14 of ≥1,284 files: 11 changed in the last 12 commits, 2 with your cases, 1 picked by path. Not a sample of the whole repository.",
    );
  });

  it("repeats the reason on the card and counts mapped files", () => {
    expect(whyShown("case", 12)).toBe("Shown because you have cases here.");
    expect(whyShown("recent", 12)).toBe("Shown because it changed in the last 12 commits.");
    expect(mappedLine(0, 14, 0)).toBe("0 of 14 mapped");
    expect(mappedLine(3, 14, 5)).toBe("3 of 14 mapped · mapping 5");
  });

  it("labels the datum with the HEAD commit, never today", () => {
    expect(headLabel(syntheticOverview.head!)).toEqual({
      sha: "4e1d0a2",
      day: "25 Sep",
      year: "2026",
    });
  });
});
