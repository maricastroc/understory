import type { Evidence } from "@git-investigator/core/types";
import { buildCausalChain } from "../../chain/use-causal-chain";
import type { ChainLinks, ViewArtifact, ViewGap } from "./types";

export function countLinks(
  evidence: Evidence,
  artifacts: ViewArtifact[],
  gaps: ViewGap[],
): ChainLinks | null {
  const chain = buildCausalChain(evidence.artifacts);
  if (chain.mode !== "lanes") return null;
  const onBore = new Set(artifacts.filter((a) => a.onBore).map((a) => a.id));
  let filled = 0;
  for (const lane of chain.lanes) {
    if (!onBore.has(lane.commit.id)) continue;
    filled += 1;
    if (lane.pr.artifact) filled += 1;
    if (lane.review.artifact) filled += 1;
    if (lane.issue.artifact) filled += 1;
  }
  return { filled, gaps: gaps.length, unverified: gaps.filter((g) => !g.verified).length };
}
