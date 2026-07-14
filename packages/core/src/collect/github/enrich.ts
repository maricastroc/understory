import type { Artifact } from "../../types";
import { commitArtifact, issueArtifact, prArtifact, reviewArtifact } from "./artifacts";
import type { BlameCommit } from "./blame";
import { foldComments } from "./comments";

// A single blamed commit expanded into its evidence trail: the commit, then each
// associated PR with its closing issues and reviews, in a stable order. Threaded
// discussion — the PR conversation, review threads, issue comments — is folded into
// each artifact's body, since that back-and-forth is where the real "why" usually lives;
// because the id is unchanged, grounding and entailment quote against it for free.
// Callers dedupe by id (globally for the line collector, per-cluster for the diff
// collector). Shared so the two collectors can never drift in how they enrich a commit.
export function expandCommit(bc: BlameCommit): Artifact[] {
  const out: Artifact[] = [];
  const commit = commitArtifact(bc);
  out.push(commit);
  for (const pr of bc.associatedPullRequests.nodes) {
    const prCard = prArtifact(pr, commit.id);
    prCard.body = foldComments(prCard.body, pr.comments?.nodes ?? []);
    out.push(prCard);
    for (const iss of pr.closingIssuesReferences.nodes) {
      const issCard = issueArtifact(iss, prCard.id);
      issCard.body = foldComments(issCard.body, iss.comments?.nodes ?? []);
      out.push(issCard);
    }
    pr.reviews.nodes.forEach((rv, i) => {
      const comments = rv.comments?.nodes ?? [];
      // Keep a review even when its top-level body is empty, as long as it argued the
      // point in an inline thread — that discussion is often the actual reasoning.
      if (!rv.body.trim() && !comments.some((c) => c.body?.trim())) return;
      const rvCard = reviewArtifact(pr.number, pr.url, rv, i, prCard.id);
      rvCard.body = foldComments(rv.body.trim(), comments);
      out.push(rvCard);
    });
  }
  return out;
}
