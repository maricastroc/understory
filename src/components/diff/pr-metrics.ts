import type { DiffResult } from "@git-investigator/core/diff/types";
import type { ArtifactKind } from "@git-investigator/core/types";

// What the investigation actually reconstructed, derived from the findings so the side
// panel can report the work done — not just "a PR was summarised". Distinct-by-id, so a
// PR or issue shared across regions is counted once.
export type PrMetrics = {
  filesChanged: number;
  filesWithHistory: number;
  regionsExplained: number;
  originCommits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
};

function distinctByKind(result: DiffResult, kind: ArtifactKind): number {
  const ids = new Set<string>();
  for (const f of result.findings) {
    for (const a of f.artifacts) if (a.kind === kind) ids.add(a.id);
  }
  return ids.size;
}

export function prMetrics(result: DiffResult): PrMetrics {
  return {
    filesChanged: result.triage.filesChanged,
    filesWithHistory: result.triage.filesConsidered,
    // A region counts as explained only when the model committed to a grounded answer.
    regionsExplained: result.findings.filter((f) => f.recorded && f.grounded).length,
    originCommits: distinctByKind(result, "commit"),
    pullRequests: distinctByKind(result, "pull_request"),
    reviews: distinctByKind(result, "review"),
    issues: distinctByKind(result, "issue"),
  };
}
