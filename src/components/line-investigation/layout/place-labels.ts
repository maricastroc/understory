import { BORE } from "./geometry";
import type { LabelPlacement, LeaderPath } from "./types";

type Anchor = { id: string; x: number; y: number; extra?: number };

export function placeLabels(
  anchors: Anchor[],
  minTop: number,
  pitch: number,
): { labels: LabelPlacement[]; leaders: LeaderPath[] } {
  const labels: LabelPlacement[] = [];
  let previous = Number.NEGATIVE_INFINITY;
  let previousExtra = 0;
  for (const a of anchors) {
    const top = Math.max(a.y - BORE.labelAnchor, previous + pitch + previousExtra, minTop);
    previous = top;
    previousExtra = a.extra ?? 0;
    labels.push({ id: a.id, top, anchorY: top + BORE.labelAnchor });
  }

  const offsets = new Map<string, number>();
  let component: Array<{ id: string }> = [];
  let reach = Number.NEGATIVE_INFINITY;
  const flush = () => {
    const n = component.length;
    const step = n > 1 ? Math.min(BORE.leaderStep, (BORE.leaderMax - BORE.leaderMin) / (n - 1)) : 0;
    component.forEach((c, j) => offsets.set(c.id, BORE.leaderMax - j * step));
    component = [];
  };
  anchors.forEach((a, i) => {
    const end = labels[i].anchorY;
    if (Math.abs(end - a.y) < 0.5) return;
    if (a.y > reach) flush();
    component.push({ id: a.id });
    reach = Math.max(reach, end);
  });
  flush();

  const leaders: LeaderPath[] = anchors.map((a, i) => {
    const end = labels[i].anchorY;
    const off = offsets.get(a.id);
    if (off === undefined)
      return {
        id: a.id,
        points: [
          [a.x, a.y],
          [BORE.labelX, a.y],
        ],
      };
    const x = BORE.coreX + off;
    return {
      id: a.id,
      points: [
        [a.x, a.y],
        [x, a.y],
        [x, end],
        [BORE.labelX, end],
      ],
    };
  });

  return { labels, leaders };
}
