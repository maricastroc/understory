import { describe, expect, it } from "vitest";
import { syntheticOverview } from "../fixtures/synthetic-overview";
import { headLabel } from "./head-label";
import { mappedLine, scopeAbout, scopeWhy, whyShown } from "./scope-copy";

describe("scope copy", () => {
  it("says why the files are shown, with counts only where they add information", () => {
    expect(scopeWhy(syntheticOverview, false, "en")).toBe(
      "12 changed in the last 12 commits · 2 with your cases",
    );
    const recent = syntheticOverview.files.slice(2, 4);
    expect(scopeWhy({ ...syntheticOverview, files: recent }, false, "en")).toBe(
      "Changed in the last 12 commits",
    );
    expect(scopeWhy({ ...syntheticOverview, files: recent }, true, "en")).toBe(
      "2 changed in the last 12 commits",
    );
  });

  it("keeps the tree total and the not-a-sample caveat for the about note", () => {
    expect(scopeAbout(syntheticOverview, "en")).toBe(
      "14 of 1,284 files at HEAD, chosen for the reasons above. Not a sample of the whole repository.",
    );
    const files = syntheticOverview.files.map((f, i) =>
      i === 3 ? { ...f, reason: "path" as const } : f,
    );
    const truncated = { ...syntheticOverview, files, truncated: true };
    expect(scopeAbout(truncated, "en")).toMatch(/^14 of ≥1,284 files at HEAD/);
    expect(scopeWhy(truncated, true, "en")).toBe(
      "11 changed in the last 12 commits · 2 with your cases · 1 picked by path",
    );
  });

  it("repeats the reason on the card and counts mapped files", () => {
    expect(whyShown("case", 12, "en")).toBe("Shown because you have cases here.");
    expect(whyShown("recent", 12, "en")).toBe("Shown because it changed in the last 12 commits.");
    expect(mappedLine(0, 14, 0, "en")).toBe("0 of 14 mapped");
    expect(mappedLine(3, 14, 5, "en")).toBe("3 of 14 mapped · mapping 5");
  });

  it("labels the datum with the HEAD commit, never today", () => {
    expect(headLabel(syntheticOverview.head!, "en")).toEqual({
      sha: "4e1d0a2",
      day: "25 Sep",
      year: "2026",
    });
  });
});
