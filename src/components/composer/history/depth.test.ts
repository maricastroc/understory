import type { FileHistory } from "@git-investigator/core/types";
import { describe, expect, it } from "vitest";
import { coreHistory, depthScale, markTone, markWidth } from "./depth";
import { MAP } from "./map-geometry";
import { historyFacts, historyShares, shareLine } from "./share-copy";

const head = { sha: "h".repeat(40), date: "2026-09-25T00:00:00Z" };

const history = (
  marks: Array<[string, number, FileHistory["marks"][number]["prLookup"]]>,
  cut = false,
): FileHistory => ({
  path: "a.ts",
  blobSha: "b",
  status: "mapped",
  lineCount: marks.reduce((a, [, l]) => a + l, 0),
  marks: marks.map(([at, lines, prLookup], i) => ({
    sha: `c${i}`,
    at,
    lines,
    prLookup,
    boundary: false,
  })),
  cut,
});

describe("depth", () => {
  it("measures age from the HEAD commit, never from today", () => {
    const h = history([["2025-09-25T00:00:00Z", 10, "found"]]);
    const scale = depthScale([h], head);
    const view = coreHistory(h, head, scale);
    expect(Math.round(scale.maxYears * 10) / 10).toBe(1);
    expect(Math.round(view.bottom)).toBe(Math.round(MAP.datumY + scale.pxPerYear * (365 / 365.25)));
  });

  it("keeps 78 px per year for young repos and compresses deep ones", () => {
    expect(depthScale([history([["2024-09-25T00:00:00Z", 1, "found"]])], head).pxPerYear).toBe(78);
    const deep = depthScale([history([["2006-09-25T00:00:00Z", 1, "found"]])], head);
    expect(deep.pxPerYear).toBe(24);
    expect(deep.ticks.slice(0, 3)).toEqual([2, 4, 6]);
  });

  it("sizes marks by the share of current lines and never turns unknown into none", () => {
    expect(markWidth(1, 100)).toBe(6);
    expect(markWidth(100, 100)).toBe(36);
    expect(markTone("found")).toBe("found");
    expect(markTone("none")).toBe("none");
    expect(markTone("skipped")).toBe("unknown");
    expect(markTone("failed")).toBe("unknown");
  });
});

describe("share copy", () => {
  const a = history([
    ["2025-01-01T00:00:00Z", 6, "found"],
    ["2021-01-01T00:00:00Z", 2, "none"],
    ["2020-01-01T00:00:00Z", 2, "failed"],
  ]);

  it("scopes the percentage to the mapped files and reports not-checked separately", () => {
    expect(shareLine([a], "github")).toBe(
      "75% of lines in 1 mapped file have a PR · 20% not checked",
    );
    expect(shareLine([a, { ...a, path: "b.ts" }], "github")).toMatch(/in 2 mapped files/);
    expect(shareLine([], "github")).toBeNull();
    expect(shareLine([a], "none")).toBe("PR data unavailable for this repo");
    expect(shareLine([history([["2020-01-01T00:00:00Z", 3, "skipped"]])], "github")).toBe(
      "PR lookups unavailable for the 1 mapped file",
    );
  });

  it("states depth as the oldest surviving line and qualifies a cut history as a lower bound", () => {
    const view = coreHistory(a, head, depthScale([a], head));
    expect(historyFacts(view)).toBe(
      "Oldest surviving line: 6y 8m. 3 commits own its 10 lines at HEAD.",
    );
    expect(historyShares(view)).toBe("60% PR · 20% no PR · 20% not checked (of lines)");
    const cut = coreHistory({ ...a, cut: true }, head, depthScale([a], head));
    expect(historyFacts(cut)).toMatch(
      /^Oldest surviving line: ≥ 6y 8m\..* History cut at clone depth\.$/,
    );
  });
});
