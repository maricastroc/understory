import type { ArtifactKind } from "@understory/core/types";

export const BORE = {
  coreX: 500,
  labelX: 546,
  firstSegment: 40,
  breakHeight: 40,
  clusterPad: 16,
  clusterDays: 45,
  minPxPerDay: 12,
  maxPxPerDay: 24,
  spanBudget: 120,
  bandWidth: 12,
  bandMin: 12,
  gapOffset: 6,
  gapSeparation: 6,
  labelAnchor: 8,
  labelPitch: 60,
  leaderMin: 20,
  leaderMax: 40,
  leaderStep: 6,
  gapLeaderX: 510,
  maxPerKind: 4,
} as const;

export const HALF: Record<ArtifactKind, number> = {
  commit: 7,
  issue: 8.5,
  pull_request: 6,
  review: 1,
};

export const LEADER_X: Record<ArtifactKind, number> = {
  commit: 507,
  issue: 509,
  pull_request: 506,
  review: 517,
};

export const DAY = 86_400_000;
