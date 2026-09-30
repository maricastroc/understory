import type { Artifact, ArtifactKind } from "@understory/core/types";

export type ChainSlot = { artifact: Artifact | null; extra: number };

export type ChainLane = {
  commit: Artifact;
  issue: ChainSlot;
  pr: ChainSlot;
  review: ChainSlot;
};

export type ChainGroup = { kind: ArtifactKind; items: Artifact[] };

export type CausalChain =
  | { mode: "empty" }
  | { mode: "commits-only"; commits: Artifact[] }
  | { mode: "grouped"; groups: ChainGroup[] }
  | { mode: "lanes"; lanes: ChainLane[]; gaps: number };

const GROUP_ORDER: ArtifactKind[] = ["issue", "pull_request", "review", "commit"];

const slot = (items: Artifact[]): ChainSlot => ({
  artifact: items[0] ?? null,
  extra: Math.max(0, items.length - 1),
});

function laneGaps(lane: ChainLane): number {
  if (!lane.pr.artifact) return 1;
  return (lane.issue.artifact ? 0 : 1) + (lane.review.artifact ? 0 : 1);
}

export function buildCausalChain(artifacts: Artifact[]): CausalChain {
  if (artifacts.length === 0) return { mode: "empty" };

  const commits = artifacts.filter((a) => a.kind === "commit");
  const hasUpstream = artifacts.some((a) => a.kind !== "commit");
  const hasEdges = artifacts.some((a) => a.parentId != null);

  if (!hasUpstream) {
    return { mode: "commits-only", commits: [...commits].reverse() };
  }

  if (!hasEdges) {
    const groups = GROUP_ORDER.map((kind) => ({
      kind,
      items: artifacts.filter((a) => a.kind === kind),
    })).filter((g) => g.items.length > 0);
    return { mode: "grouped", groups };
  }

  const childrenOf = (parentId: string, kind: ArtifactKind) =>
    artifacts.filter((a) => a.kind === kind && a.parentId === parentId);

  const lanes: ChainLane[] = commits
    .map((commit) => {
      const pr = childrenOf(commit.id, "pull_request")[0] ?? null;
      return {
        commit,
        pr: slot(childrenOf(commit.id, "pull_request")),
        issue: pr ? slot(childrenOf(pr.id, "issue")) : { artifact: null, extra: 0 },
        review: pr ? slot(childrenOf(pr.id, "review")) : { artifact: null, extra: 0 },
      };
    })
    .reverse();

  const gaps = lanes.reduce((sum, lane) => sum + laneGaps(lane), 0);
  return { mode: "lanes", lanes, gaps };
}
