import type { InvestigationView, ViewGap } from "../model/types";
import type { BoreGapInput, BoreItem } from "./types";

export function gapHeight(gap: ViewGap): number {
  if (!gap.verified) return 24;
  return gap.missing === "pull_request" ? 96 : 40;
}

function parse(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function boreInput(view: InvestigationView): { items: BoreItem[]; gaps: BoreGapInput[] } {
  const items: BoreItem[] = view.artifacts.flatMap((a) => {
    const time = parse(a.date);
    if (!a.onBore || time === null) return [];
    return [{ id: a.id, kind: a.kind, time, endTime: parse(a.endDate) }];
  });
  const onBore = new Set(items.map((i) => i.id));
  const gaps = view.gaps
    .filter((g) => onBore.has(g.afterId))
    .map((g) => ({ id: g.id, afterId: g.afterId, height: gapHeight(g) }));
  return { items, gaps };
}
