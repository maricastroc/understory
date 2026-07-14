import type { Artifact } from "../../types";
import { commitArtifact, issueArtifact, prArtifact, reviewArtifact } from "./artifacts";
import type { BlameCommit } from "./blame";

// A single blamed commit expanded into its evidence trail: the commit, then each
// associated PR with its closing issues and non-empty reviews, in a stable order.
// Callers dedupe by id (globally for the line collector, per-cluster for the diff
// collector). Shared so the two collectors can never drift in how they enrich a commit.
export function expandCommit(bc: BlameCommit): Artifact[] {
  const out: Artifact[] = [];
  const commit = commitArtifact(bc);
  out.push(commit);
  for (const pr of bc.associatedPullRequests.nodes) {
    const prCard = prArtifact(pr, commit.id);
    out.push(prCard);
    for (const iss of pr.closingIssuesReferences.nodes) out.push(issueArtifact(iss, prCard.id));
    pr.reviews.nodes.forEach((rv, i) => {
      if (rv.body.trim()) out.push(reviewArtifact(pr.number, pr.url, rv, i, prCard.id));
    });
  }
  return out;
}
