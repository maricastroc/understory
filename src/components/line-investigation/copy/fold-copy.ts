import type { ArtifactKind } from "@understory/core/types";

const NOUNS: Record<ArtifactKind, [string, string]> = {
  commit: ["commit", "commits"],
  pull_request: ["PR", "PRs"],
  review: ["review", "reviews"],
  issue: ["issue", "issues"],
};

const ORDER: ArtifactKind[] = ["commit", "pull_request", "review", "issue"];

export function foldParts(kinds: ArtifactKind[]): string[] {
  return ORDER.flatMap((kind) => {
    const n = kinds.filter((k) => k === kind).length;
    return n ? [`${n} ${NOUNS[kind][n === 1 ? 0 : 1]}`] : [];
  });
}

export function foldLabel(count: number): string {
  return `${count} more in the history`;
}

export function foldName(kinds: ArtifactKind[]): string {
  return `Show ${foldLabel(kinds.length)}: ${foldParts(kinds).join(", ")}`;
}
