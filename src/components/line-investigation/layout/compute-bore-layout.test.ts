import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "../model/build-investigation-view";
import { boreInput } from "./bore-input";
import { computeBoreLayout } from "./compute-bore-layout";
import { BORE, DAY } from "./geometry";
import { groupId } from "./group-crowded";
import type { BoreItem, BoreLayout, BoreOptions } from "./types";

const NOW = Date.parse(SYNTHETIC_NOW);
const DATUM = 280;
const opts: BoreOptions = { now: NOW, datumY: DATUM };

function layoutOf(result = syntheticRetryCap, extra: Partial<BoreOptions> = {}) {
  const view = buildInvestigationView(result, { now: NOW });
  const { items, gaps } = boreInput(view);
  return { view, layout: computeBoreLayout(items, gaps, { ...opts, ...extra }) };
}

type Seg = [[number, number], [number, number]];

function orient(a: [number, number], b: [number, number], c: [number, number]): number {
  const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(v) < 1e-9 ? 0 : Math.sign(v);
}

function onSegment(a: [number, number], b: [number, number], p: [number, number]): boolean {
  return (
    Math.min(a[0], b[0]) - 1e-9 <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
    Math.min(a[1], b[1]) - 1e-9 <= p[1] &&
    p[1] <= Math.max(a[1], b[1]) + 1e-9
  );
}

function intersects([p1, p2]: Seg, [q1, q2]: Seg): boolean {
  const o1 = orient(p1, p2, q1);
  const o2 = orient(p1, p2, q2);
  const o3 = orient(q1, q2, p1);
  const o4 = orient(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, p2, q2)) return true;
  if (o3 === 0 && onSegment(q1, q2, p1)) return true;
  if (o4 === 0 && onSegment(q1, q2, p2)) return true;
  return false;
}

function segments(points: Array<[number, number]>): Seg[] {
  return points.slice(1).map((p, i) => [points[i], p]);
}

function expectWellFormed(layout: BoreLayout, pitch = BORE.labelPitch) {
  const tops = layout.labels.map((l) => l.top);
  for (let i = 1; i < tops.length; i++)
    expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(pitch - 1e-9);
  for (const l of layout.labels) expect(l.top).toBeGreaterThanOrEqual(DATUM + BORE.firstSegment);

  for (let i = 0; i < layout.leaders.length; i++) {
    for (let j = i + 1; j < layout.leaders.length; j++) {
      for (const a of segments(layout.leaders[i].points)) {
        for (const b of segments(layout.leaders[j].points)) {
          expect(intersects(a, b), `${layout.leaders[i].id} crosses ${layout.leaders[j].id}`).toBe(
            false,
          );
        }
      }
    }
  }

  for (const leader of layout.leaders) {
    const xs = leader.points.map((p) => p[0]);
    expect(Math.max(...xs)).toBeLessThanOrEqual(BORE.labelX);
    expect(leader.points[leader.points.length - 1][0]).toBe(BORE.labelX);
  }

  const gutter = [
    ...layout.ticks.map((t) => [t.y - 6, t.y + 6] as const),
    ...layout.breaks.filter((b) => b.kind === "gap").map((b) => [b.top + 2, b.top + 25] as const),
  ].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < gutter.length; i++)
    expect(gutter[i][0]).toBeGreaterThanOrEqual(gutter[i - 1][1]);
}

describe("crossing check used by these tests", () => {
  it("detects a real crossing and a collinear overlap, and accepts parallel leaders", () => {
    expect(
      intersects(
        [
          [0, 0],
          [10, 10],
        ],
        [
          [0, 10],
          [10, 0],
        ],
      ),
    ).toBe(true);
    expect(
      intersects(
        [
          [0, 5],
          [10, 5],
        ],
        [
          [4, 5],
          [20, 5],
        ],
      ),
    ).toBe(true);
    expect(
      intersects(
        [
          [0, 0],
          [10, 0],
        ],
        [
          [0, 5],
          [10, 5],
        ],
      ),
    ).toBe(false);
  });
});

describe("computeBoreLayout — retry-cap case", () => {
  const { layout } = layoutOf();
  const glyph = (id: string) => layout.glyphs.find((g) => g.id === id)!;

  it("opens with a labelled 'unchanged for' segment measured from today", () => {
    const first = layout.breaks[0];
    expect(first).toMatchObject({ kind: "first", top: DATUM, height: 40, strokes: true });
    expect(first.days / 365.25).toBeCloseTo(3.54, 2);
  });

  it("compresses the 21-month quiet period into one 40px break", () => {
    const gaps = layout.breaks.filter((b) => b.kind === "gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0].height).toBe(40);
    expect(gaps[0].days).toBeCloseTo(
      (Date.parse("2023-03-02T09:14:00Z") - Date.parse("2021-06-18T14:02:00Z")) / DAY,
      6,
    );
  });

  it("keeps real relative time inside a cluster: 13 days apart is at least 150px", () => {
    const commit = glyph("commit:92f6a3f");
    const issue = glyph("issue:1187");
    expect(issue.y - commit.y).toBeGreaterThanOrEqual(150);
    expect(glyph("review:812-1").y).toBeGreaterThan(commit.y);
    expect(glyph("review:812-0").y).toBeGreaterThan(glyph("review:812-1").y);
    expect(glyph("commit:7be210e").y).toBeGreaterThan(issue.y + 40);
  });

  it("draws the PR as a band from merge to open", () => {
    const band = glyph("pr:812");
    expect(band.top).toBeCloseTo(glyph("commit:92f6a3f").y, 6);
    expect(band.bottom).toBeGreaterThan(band.top + 12);
    expect(band.anchorY).toBe(band.bottom);
  });

  it("hangs the verified gap under the direct commit", () => {
    expect(layout.gaps).toEqual([
      expect.objectContaining({ afterId: "commit:7be210e", height: 96 }),
    ]);
    expect(layout.gaps[0].top).toBeGreaterThan(glyph("commit:7be210e").bottom);
  });

  it("ticks only the first glyph of each cluster", () => {
    expect(layout.ticks).toHaveLength(2);
    expect(layout.ticks.map((t) => t.cluster)).toEqual([0, 1]);
  });

  it("has no crossing leaders and no colliding labels", () => {
    expectWellFormed(layout);
    expect(layout.labels.map((l) => l.id)).toEqual([
      "commit:92f6a3f",
      "review:812-1",
      "review:812-0",
      "pr:812",
      "issue:1187",
      "commit:7be210e",
      "gap:pull_request:commit:7be210e",
    ]);
  });

  it("is deterministic", () => {
    expect(layoutOf().layout).toEqual(layout);
  });
});

describe("computeBoreLayout — other shapes", () => {
  it("lays out commits only, with neutral unverified gaps", () => {
    const { layout } = layoutOf(states.syntheticCommitsOnly());
    expect(layout.glyphs.map((g) => g.kind)).toEqual(["commit", "commit"]);
    expect(layout.gaps.map((g) => g.height)).toEqual([24, 24]);
    expectWellFormed(layout);
  });

  it("handles a single artifact with a straight leader", () => {
    const item: BoreItem = {
      id: "commit:a",
      kind: "commit",
      time: NOW - 400 * DAY,
      endTime: null,
    };
    const layout = computeBoreLayout([item], [], opts);
    expect(layout.glyphs).toHaveLength(1);
    expect(layout.breaks).toHaveLength(1);
    expect(layout.leaders[0].points).toHaveLength(2);
    expectWellFormed(layout);
  });

  it("does not draw break strokes when the line changed recently", () => {
    const item: BoreItem = { id: "commit:a", kind: "commit", time: NOW - 3 * DAY, endTime: null };
    const layout = computeBoreLayout([item], [], opts);
    expect(layout.breaks[0]).toMatchObject({ kind: "first", strokes: false });
  });

  it("draws nothing for a line with no history", () => {
    expect(computeBoreLayout([], [], opts)).toEqual({
      glyphs: [],
      gaps: [],
      labels: [],
      leaders: [],
      breaks: [],
      ticks: [],
      height: 0,
    });
  });

  it("gives a PR without a merge date a minimum 12px band", () => {
    const pr: BoreItem = { id: "pr:1", kind: "pull_request", time: NOW - 100 * DAY, endTime: null };
    const [band] = computeBoreLayout([pr], [], opts).glyphs;
    expect(band.bottom - band.top).toBe(12);
  });

  it("bounds cluster height when artifacts keep arriving every few weeks", () => {
    const items: BoreItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `commit:${i}`,
      kind: "commit",
      time: NOW - (100 + i * 30) * DAY,
      endTime: null,
    }));
    const layout = computeBoreLayout(items, [], opts);
    const byCluster = new Map<number, number[]>();
    for (const g of layout.glyphs)
      byCluster.set(g.cluster, [...(byCluster.get(g.cluster) ?? []), g.y]);
    for (const ys of byCluster.values()) {
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(
        BORE.clusterDays * BORE.minPxPerDay,
      );
    }
    expect(layout.breaks.filter((b) => b.kind === "gap").length).toBeGreaterThan(0);
    expectWellFormed(layout);
  });

  it("pushes deeper history down instead of letting a gap overlap it", () => {
    const items: BoreItem[] = [
      { id: "commit:new", kind: "commit", time: NOW - 400 * DAY, endTime: null },
      { id: "commit:old", kind: "commit", time: NOW - 402 * DAY, endTime: null },
    ];
    const layout = computeBoreLayout(
      items,
      [{ id: "gap:x", afterId: "commit:new", height: 96 }],
      opts,
    );
    const gap = layout.gaps[0];
    const older = layout.glyphs.find((g) => g.id === "commit:old")!;
    expect(older.top).toBeGreaterThanOrEqual(gap.top + gap.height);
    expectWellFormed(layout);
  });
});

describe("computeBoreLayout — crowded history", () => {
  const many = states.syntheticManyArtifacts(24);

  it("collapses more than four artifacts of one kind in a cluster into one counted glyph", () => {
    const { layout } = layoutOf(many);
    const groups = layout.glyphs.filter((g) => g.members.length > 1);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("review");
    expect(groups[0].members).toHaveLength(26);
    expectWellFormed(layout);
  });

  it("stays well-formed when the group is expanded", () => {
    const collapsed = layoutOf(many).layout;
    const id = collapsed.glyphs.find((g) => g.members.length > 1)!.id;
    const { layout } = layoutOf(many, { expandedGroups: new Set([id]) });
    expect(layout.glyphs.filter((g) => g.kind === "review")).toHaveLength(26);
    expectWellFormed(layout);
  });

  it("keeps the time scale identical between collapsed and expanded states", () => {
    const collapsed = layoutOf(many).layout;
    const id = collapsed.glyphs.find((g) => g.members.length > 1)!.id;
    const expanded = layoutOf(many, { expandedGroups: new Set([id]) }).layout;
    const y = (l: BoreLayout, gid: string) => l.glyphs.find((g) => g.id === gid)!.y;
    expect(y(expanded, "commit:92f6a3f")).toBe(y(collapsed, "commit:92f6a3f"));
    expect(y(expanded, "issue:1187")).toBe(y(collapsed, "issue:1187"));
    expect(id).toBe(groupId(collapsed.glyphs.find((g) => g.members.length > 1)!.members[0]));
  });
});
