import type { Artifact, ArtifactKind } from "@understory/core/types";

const KIND_RANK: Record<ArtifactKind, number> = {
  commit: 0,
  pull_request: 1,
  review: 2,
  issue: 3,
};

export function timeOf(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function byDepth(a: Artifact, b: Artifact): number {
  const ta = timeOf(a.date) ?? Number.NEGATIVE_INFINITY;
  const tb = timeOf(b.date) ?? Number.NEGATIVE_INFINITY;
  if (ta !== tb) return ta > tb ? -1 : 1;
  return KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.id.localeCompare(b.id);
}
