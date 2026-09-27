import { BORE, HALF, LEADER_X } from "./geometry";
import { groupCrowded } from "./group-crowded";
import { placeLabels } from "./place-labels";
import { timeAxis } from "./time-axis";
import type {
  AxisBreak,
  BoreGapInput,
  BoreItem,
  BoreLayout,
  BoreOptions,
  DepthTick,
  GapPlacement,
  GlyphPlacement,
} from "./types";

const KIND_RANK = { commit: 0, pull_request: 1, review: 2, issue: 3 } as const;

function byDepth(a: BoreItem, b: BoreItem): number {
  if (a.time !== b.time) return b.time - a.time;
  return KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.id.localeCompare(b.id);
}

function resolveGapCollisions(
  glyphs: GlyphPlacement[],
  gaps: GapPlacement[],
  breaks: AxisBreak[],
  ticks: DepthTick[],
) {
  for (const gap of [...gaps].sort((a, b) => a.top - b.top)) {
    const floor = gap.top + gap.height + BORE.gapSeparation;
    const blockers = [
      ...glyphs.filter((g) => g.id !== gap.afterId && g.top >= gap.top && g.top < floor),
      ...breaks.filter((b) => b.top >= gap.top && b.top < floor),
    ];
    const delta = Math.max(0, ...blockers.map((b) => floor - b.top));
    if (delta === 0) continue;
    for (const g of glyphs) {
      if (g.id === gap.afterId || g.top < gap.top) continue;
      g.y += delta;
      g.top += delta;
      g.bottom += delta;
      g.anchorY += delta;
    }
    for (const other of gaps) {
      if (other !== gap && other.top >= gap.top) {
        other.top += delta;
        other.anchorY += delta;
      }
    }
    for (const b of breaks) if (b.top >= gap.top) b.top += delta;
    for (const t of ticks) if (t.y >= gap.top) t.y += delta;
  }
}

export function computeBoreLayout(
  items: BoreItem[],
  gapInputs: BoreGapInput[],
  opts: BoreOptions,
): BoreLayout {
  if (items.length === 0) {
    return { glyphs: [], gaps: [], labels: [], leaders: [], breaks: [], ticks: [], height: 0 };
  }

  const ordered = [...items].sort(byDepth);
  const times = ordered.flatMap((i) => (i.endTime !== null ? [i.time, i.endTime] : [i.time]));
  const { breaks, ticks, clusterOf, yOf } = timeAxis(times, opts);

  const placed = groupCrowded(ordered, clusterOf, opts.expandedGroups ?? new Set());
  const glyphs: GlyphPlacement[] = placed.map((item) => {
    const y = yOf(item.time);
    let top = y - HALF[item.kind];
    let bottom = y + HALF[item.kind];
    let anchorY = y;
    if (item.kind === "pull_request") {
      const merged = item.endTime !== null ? yOf(item.endTime) : null;
      top = merged !== null ? Math.min(merged, y) : y - BORE.bandMin / 2;
      bottom = merged !== null ? Math.max(merged, y) : y + BORE.bandMin / 2;
      if (bottom - top < BORE.bandMin) {
        const mid = (top + bottom) / 2;
        top = mid - BORE.bandMin / 2;
        bottom = mid + BORE.bandMin / 2;
      }
      anchorY = bottom;
    }
    return {
      id: item.id,
      kind: item.kind,
      members: item.members,
      y,
      top,
      bottom,
      anchorY,
      leaderX: LEADER_X[item.kind],
      cluster: clusterOf(item.time),
    };
  });

  const hostOf = new Map(glyphs.flatMap((g) => g.members.map((m) => [m, g] as const)));
  const gaps: GapPlacement[] = gapInputs.flatMap((g) => {
    const host = hostOf.get(g.afterId);
    if (!host) return [];
    const top = host.bottom + BORE.gapOffset;
    return [{ id: g.id, afterId: host.id, top, height: g.height, anchorY: top + g.height / 2 }];
  });

  resolveGapCollisions(glyphs, gaps, breaks, ticks);

  const anchors = [
    ...glyphs.map((g, i) => ({ id: g.id, x: g.leaderX, y: g.anchorY, order: i })),
    ...gaps.map((g, i) => ({
      id: g.id,
      x: BORE.gapLeaderX,
      y: g.anchorY,
      order: glyphs.length + i,
    })),
  ].sort((a, b) => a.y - b.y || a.order - b.order);
  const { labels, leaders } = placeLabels(
    anchors,
    opts.datumY + BORE.firstSegment,
    opts.labelPitch ?? BORE.labelPitch,
  );

  const height = Math.max(
    ...glyphs.map((g) => g.bottom),
    ...gaps.map((g) => g.top + g.height),
    ...breaks.map((b) => b.top + b.height),
    ...labels.map((l) => l.top + (opts.labelPitch ?? BORE.labelPitch)),
  );

  return { glyphs, gaps, labels, leaders, breaks, ticks, height: height - opts.datumY };
}
