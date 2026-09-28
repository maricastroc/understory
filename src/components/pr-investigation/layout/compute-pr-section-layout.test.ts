import { describe, expect, it } from "vitest";
import { SYNTHETIC_PR_NOW, syntheticPr944 } from "../fixtures/synthetic-pr-944";
import {
  syntheticPrManyRegions,
  syntheticPrOverlappingBands,
} from "../fixtures/synthetic-pr-states";
import { buildPrView } from "../model/build-pr-view";
import { computePrSectionLayout } from "./compute-pr-section-layout";
import type { PrSectionOptions } from "./types";

const now = Date.parse(SYNTHETIC_PR_NOW);
const OPTS: PrSectionOptions = {
  datumY: 300,
  axisX: 470,
  right: 1120,
  selected: null,
  showLetters: false,
};
const layoutOf = (result = syntheticPr944, opts: Partial<PrSectionOptions> = {}) =>
  computePrSectionLayout(buildPrView(result, { now }), { ...OPTS, ...opts });

describe("PR section geometry — #944", () => {
  const l = layoutOf();
  const core = (id: string) => l.cores.find((c) => c.key === id)!;

  it("spaces one core per region with the clamped step", () => {
    expect(l.cores.map((c) => c.label)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]);
    expect(l.step).toBe(70);
    expect(l.cores.map((c) => c.x)).toEqual([520, 590, 660, 730, 800, 870, 940, 1010]);
  });

  it("draws pr:1020 once, as a band across R1–R4, never once per core", () => {
    const bands = l.bands.filter((b) => b.id === "pr:1020");
    expect(bands).toHaveLength(1);
    expect(bands[0]).toMatchObject({
      cores: ["R1", "R2", "R3", "R4"],
      x1: 508,
      x2: 742,
      stubs: [],
    });
    expect(bands[0].bottom - bands[0].top).toBeGreaterThanOrEqual(24);
    expect(l.prs.map((p) => [p.id, p.core])).toEqual([
      ["pr:1188", "R7"],
      ["pr:1101", "R6"],
      ["pr:201", "R1"],
    ]);
  });

  it("draws the shared squash commit on each core it owns, as one artifact", () => {
    expect(l.commits.filter((c) => c.id === "commit:e4c19aa").map((c) => c.core)).toEqual([
      "R1",
      "R2",
      "R3",
      "R4",
    ]);
  });

  it("puts reviews on the band's right edge and the linked issue below its middle", () => {
    const band = l.bands[0];
    expect(
      l.reviews
        .filter((r) => r.x === band.x2)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["review:1020-1", "review:1020-2"]);
    const issue = l.issues.find((i) => i.id === "issue:998")!;
    expect(issue.x).toBe((band.x1 + band.x2) / 2);
    expect(issue.stem).toEqual({ y1: band.bottom, y2: issue.y - 8 });
  });

  it("ends cores at their deepest collected artifact and only R1 goes deeper", () => {
    const band = l.bands[0];
    for (const id of ["R2", "R3", "R4"])
      expect(core(id)).toMatchObject({ bottom: band.bottom, cap: true });
    expect(core("R1").bottom).toBeGreaterThan(band.bottom + 100);
  });

  it("ends silent regions in a 48 px hatch under their last commit", () => {
    expect(l.hatches.map((h) => [h.regionId, h.height])).toEqual([
      ["R5", 48],
      ["R8", 48],
    ]);
    const commit = l.commits.find((c) => c.core === "R5")!;
    expect(l.hatches[0].top).toBeGreaterThan(commit.y);
  });

  it("keeps depth monotonic: older artifacts sit lower", () => {
    const y = (id: string) => l.commits.find((c) => c.id === id)!.y;
    expect(y("commit:3f0a9d1")).toBeLessThan(y("commit:b81e02c"));
    expect(y("commit:b81e02c")).toBeLessThan(y("commit:e4c19aa"));
    expect(y("commit:e4c19aa")).toBeLessThan(y("commit:71aa204"));
    expect(Math.min(...l.commits.map((c) => c.y))).toBeGreaterThan(300);
  });

  it("labels the gutter with depth ticks and gap breaks", () => {
    expect(l.labels.filter((x) => x.kind === "tick").map((x) => x.text)).toContain("−2.0y");
    expect(l.labels.some((x) => x.kind === "break" && x.text.endsWith("\ngap"))).toBe(true);
    expect(l.breaks.length).toBeGreaterThan(0);
  });

  it("shows letters only for the selected region, beside its glyphs, without collisions", () => {
    expect(layoutOf(syntheticPr944, { selected: "R4" }).letters).toEqual([]);
    const s = layoutOf(syntheticPr944, { selected: "R4", showLetters: true });
    expect(s.letters.map((x) => x.letter).sort()).toEqual(["F", "G", "H", "I", "J"]);
    const band = s.bands[0];
    expect(s.letters.find((x) => x.id === "pr:1020")!.x).toBe(730 - 34);
    for (const a of s.letters) {
      for (const b of s.letters) {
        if (a === b) continue;
        expect(Math.abs(a.y - b.y) >= 16 || Math.abs(a.x - b.x) >= 22).toBe(true);
      }
    }
    expect(s.letters.find((x) => x.id === "issue:998")!.x).toBe((band.x1 + band.x2) / 2 + 12);
  });
});

describe("PR section geometry — edge cases", () => {
  it("draws a non-contiguous group as a band on the longest run, stubs elsewhere and a connector", () => {
    const l = layoutOf(syntheticPrOverlappingBands());
    const split = l.bands.find((b) => b.stubs.length > 0)!;
    expect(split).toBeDefined();
    expect(split.connector).not.toBeNull();
    expect(split.connector!.y).toBeLessThan(split.top);
  });

  it("groups cores by file past 12 regions and expands the selected region's file", () => {
    const grouped = layoutOf(syntheticPrManyRegions(20));
    expect(grouped.cores).toHaveLength(5);
    expect(grouped.cores[0]).toMatchObject({ label: "R1–R4", grouped: true });
    const open = layoutOf(syntheticPrManyRegions(20), { selected: "R6" });
    expect(open.cores.map((c) => c.label)).toEqual([
      "R1–R4",
      "R5",
      "R6",
      "R7",
      "R8",
      "R9–R12",
      "R13–R16",
      "R17–R20",
    ]);
    expect(open.step).toBeGreaterThanOrEqual(36);
  });
});
