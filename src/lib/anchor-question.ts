import type { ArtifactKind } from "./types";

/**
 * The question a drill-down asks when anchored on each artifact kind. Single
 * source of truth: the "Investigate this" affordance previews it, `/api/dig`
 * sends it, and the resulting case shows it as its headline.
 */
export const anchorQuestion: Record<ArtifactKind, string> = {
  commit: "Why was this change made?",
  pull_request: "Why was this pull request opened?",
  issue: "Why was this issue filed?",
  review: "What did this review flag?",
};
