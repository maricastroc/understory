import type { PrView } from "../model/types";

export function deepestRegions(view: PrView, n: number): PrView {
  if (view.regions.length <= n) return view;
  const depth = new Map(view.artifacts.map((a) => [a.id, a.daysBeforeNow ?? 0]));
  const deepest = (ids: string[]) => Math.max(0, ...ids.map((id) => depth.get(id) ?? 0));
  const keep = new Set(
    [...view.regions]
      .sort((a, b) => deepest(b.artifactIds) - deepest(a.artifactIds) || a.index - b.index)
      .slice(0, n)
      .map((r) => r.id),
  );
  return {
    ...view,
    regions: view.regions.filter((r) => keep.has(r.id)),
    regionsOf: new Map(
      [...view.regionsOf].map(([id, regions]) => [id, regions.filter((r) => keep.has(r))]),
    ),
    gaps: view.gaps.filter((g) => (view.regionsOf.get(g.id) ?? []).some((r) => keep.has(r))),
  };
}
