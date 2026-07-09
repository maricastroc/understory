import type { ArtifactKind } from "./types";

export const anchorQuestion: Record<ArtifactKind, string> = {
  commit: "Why was this change made?",
  pull_request: "Why was this pull request opened?",
  issue: "Why was this issue filed?",
  review: "What did this review flag?",
};
