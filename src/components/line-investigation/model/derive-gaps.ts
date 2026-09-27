import type { Artifact, Evidence } from "@git-investigator/core/types";
import { buildCausalChain } from "../../chain/use-causal-chain";
import type { GapBasis, ViewArtifact, ViewGap } from "./types";

type Missing = ViewGap["missing"];

function gap(missing: Missing, afterId: string, basis: GapBasis): ViewGap {
  return {
    id: `gap:${missing}:${afterId}`,
    missing,
    afterId,
    verified: basis === "searched",
    basis,
  };
}

function prGap(commit: Artifact, lookup: ViewArtifact["prLookup"]): ViewGap | null {
  if (lookup === "found") return null;
  if (lookup === "none") return gap("pull_request", commit.id, "searched");
  return gap("pull_request", commit.id, lookup ?? "unknown");
}

function childGap(pr: Artifact, missing: "review" | "issue"): ViewGap | null {
  const lookup = pr.meta?.[missing === "review" ? "reviewLookup" : "issueLookup"];
  if (lookup === "found") return null;
  return gap(missing, pr.id, lookup === "none" ? "searched" : "unknown");
}

export function deriveGaps(evidence: Evidence, artifacts: ViewArtifact[]): ViewGap[] {
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  const onBore = (id: string) => byId.get(id)?.onBore === true;
  const chain = buildCausalChain(evidence.artifacts);

  if (chain.mode === "commits-only") {
    return chain.commits
      .filter((c) => onBore(c.id))
      .flatMap((c) => prGap(c, byId.get(c.id)?.prLookup ?? null) ?? []);
  }
  if (chain.mode !== "lanes") return [];

  const out: ViewGap[] = [];
  for (const lane of chain.lanes) {
    if (!onBore(lane.commit.id)) continue;
    const pr = lane.pr.artifact;
    if (!pr) {
      const g = prGap(lane.commit, byId.get(lane.commit.id)?.prLookup ?? null);
      if (g) out.push(g);
      continue;
    }
    if (!lane.review.artifact) {
      const g = childGap(pr, "review");
      if (g) out.push(g);
    }
    if (!lane.issue.artifact) {
      const g = childGap(pr, "issue");
      if (g) out.push(g);
    }
  }
  return out;
}
