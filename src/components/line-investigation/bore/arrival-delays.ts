import type { BoreLayout } from "../layout/types";

export const ARRIVAL_STEP_MS = 60;

export function arrivalDelays(layout: BoreLayout): Map<string, number> {
  const rows = [
    ...layout.glyphs.map((g) => ({ id: g.id, top: g.top })),
    ...layout.gaps.map((g) => ({ id: g.id, top: g.top })),
  ].sort((a, b) => a.top - b.top);
  return new Map(rows.map((r, i) => [r.id, i * ARRIVAL_STEP_MS]));
}
