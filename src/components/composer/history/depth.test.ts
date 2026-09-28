import type { FileHistory } from "@git-investigator/core/types";
import { describe, expect, it } from "vitest";
import { coreHistory, depthScale, markTone, markWidth } from "./depth";
import { MAP } from "./map-geometry";
import { historyFacts, historyShares, prAbsence, shareLine } from "./share-copy";

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
    expect(view.oldestDays).toBe(365);
    expect(view.bottom).toBe(MAP.datumY + scale.depth);
    expect(scale.ticks.map((t) => t.label)).toEqual(["−3m", "−6m", "−9m", "−12m"]);
  });

  it("stays linear: equal time spans get equal depth, labelled in the unit the history needs", () => {
    const young = depthScale([history([["2026-06-25T00:00:00Z", 1, "found"]])], head);
    expect(young.ticks.map((t) => t.label)).toEqual(["−1m", "−2m", "−3m"]);
    expect(young.ticks[1].offset - young.ticks[0].offset).toBeCloseTo(young.ticks[0].offset, 6);
    const mid = depthScale([history([["2023-09-25T00:00:00Z", 1, "found"]])], head);
    expect(mid.ticks.map((t) => t.label)).toEqual(["−1y", "−2y", "−3y"]);
    const deep = depthScale([history([["2006-09-25T00:00:00Z", 1, "found"]])], head);
    expect(deep.ticks.map((t) => t.label)).toEqual(["−5y", "−10y", "−15y", "−20y"]);
    const days = depthScale([history([["2026-09-21T00:00:00Z", 1, "found"]])], head);
    expect(days.ticks.map((t) => t.label)).toEqual(["−1d", "−2d", "−3d", "−4d"]);
    const weeks = depthScale([history([["2026-08-20T00:00:00Z", 1, "found"]])], head);
    expect(weeks.ticks.map((t) => t.label)).toEqual(["−2w", "−4w"]);
  });

  it("sizes the depth by the commits there are to draw, not by how old they are", () => {
    const sparse = [
      history([
        ["2026-06-25T00:00:00Z", 1, "found"],
        ["2026-09-01T00:00:00Z", 1, "found"],
        ["2026-09-20T00:00:00Z", 1, "found"],
      ]),
      history([["2026-08-25T00:00:00Z", 1, "found"]]),
    ];
    expect(depthScale(sparse, head).depth).toBe(120);
    const busy = history(
      Array.from({ length: 30 }, (_, i) => [`20${10 + (i % 16)}-03-01T00:00:00Z`, 1, "found"]),
    );
    expect(depthScale([busy], head).depth).toBe(360);
    const ten = Array.from({ length: 10 }, (_, i) =>
      history(
        Array.from({ length: 8 }, (_, j) => [
          `20${16 + ((i + j) % 10)}-05-01T00:00:00Z`,
          1,
          "found",
        ]),
      ),
    );
    const tenScale = depthScale(ten, head);
    expect(tenScale.depth).toBe(192);
    expect(tenScale.breakAt).toBeNull();
  });

  it("keeps close ages apart without inventing a break", () => {
    const close = [
      history([["2026-09-22T00:00:00Z", 1, "found"]]),
      history([["2026-09-23T00:00:00Z", 1, "found"]]),
    ];
    const scale = depthScale(close, head);
    expect(scale.breakAt).toBeNull();
    const [a, b] = close.map((h) => coreHistory(h, head, scale).bottom - MAP.datumY);
    expect(a).toBe(120);
    expect(b).toBe(80);
  });

  it("breaks the axis explicitly for one much older file, and only that core crosses the break", () => {
    const outlier = history([
      ["2014-01-01T00:00:00Z", 1, "found"],
      ["2026-09-01T00:00:00Z", 1, "found"],
    ]);
    const others = [
      history([["2026-07-01T00:00:00Z", 1, "found"]]),
      history([["2026-09-22T00:00:00Z", 1, "found"]]),
    ];
    const scale = depthScale([outlier, ...others], head);
    expect(scale.breakAt).not.toBeNull();
    expect(scale.depth).toBe(168);
    const views = [outlier, ...others].map((h) => coreHistory(h, head, scale));
    expect(views[0].breakY).toBe(MAP.datumY + scale.breakAt!);
    expect(views[0].bottom).toBe(MAP.datumY + scale.depth);
    expect(views[1].breakY).toBeNull();
    expect(views[2].breakY).toBeNull();
    expect(views[1].bottom - MAP.datumY).toBeCloseTo(100, 0);
    const labels = scale.ticks.map((t) => t.label);
    expect(labels[labels.length - 1]).toBe("−12y");
    expect(labels.slice(0, -1).every((l) => l.endsWith("m") || l.endsWith("w"))).toBe(true);
    const mixed = depthScale(
      [
        history([["2022-09-25T00:00:00Z", 1, "found"]]),
        history([["2026-07-25T00:00:00Z", 1, "found"]]),
        history([["2026-09-22T00:00:00Z", 1, "found"]]),
      ],
      head,
    );
    expect(mixed.breakAt).not.toBeNull();
    expect(mixed.ticks[mixed.ticks.length - 1].label).toBe("−4y");
  });

  it("sizes marks by the share of current lines and never turns unknown into none", () => {
    expect(markWidth(1, 100)).toBe(8);
    expect(markWidth(100, 100)).toBe(40);
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
    expect(shareLine([a], "none")).toBeNull();
    const skipped = history([["2020-01-01T00:00:00Z", 3, "skipped"]]);
    expect(shareLine([skipped], "github")).toBeNull();
  });

  it("keeps the absence of PR data out of the legend and says it where it is asked for", () => {
    expect(prAbsence([a], "none")).toMatch(/^PR data is unavailable for this repo/);
    expect(prAbsence([history([["2020-01-01T00:00:00Z", 3, "skipped"]])], "github")).toBe(
      "PR lookups were unavailable for the 1 mapped file.",
    );
    expect(prAbsence([a], "github")).toBeNull();
    expect(prAbsence([], "github")).toBeNull();
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
