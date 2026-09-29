import type { Artifact } from "../../types";
import { commitArtifact, issueArtifact, prArtifact, reviewArtifact } from "./artifacts";
import type { BlameCommit } from "./blame";
import { withoutBots } from "./bots";
import { foldComments } from "./comments";

const MAX_REVIEWS = 5;

export function expandCommit(bc: BlameCommit): Artifact[] {
  const out: Artifact[] = [];
  const commit = commitArtifact(bc);
  if (bc.prLookup) commit.meta = { ...commit.meta, prLookup: bc.prLookup };
  out.push(commit);
  for (const pr of bc.associatedPullRequests.nodes) {
    const reviews = withoutBots(pr.reviews.nodes).slice(0, MAX_REVIEWS);
    const prCard = prArtifact(pr, commit.id);
    prCard.body = foldComments(prCard.body, pr.comments?.nodes ?? []);
    prCard.meta = {
      ...prCard.meta,
      reviewLookup: reviews.length > 0 ? "found" : "none",
      issueLookup: pr.closingIssuesReferences.nodes.length > 0 ? "found" : "none",
    };
    out.push(prCard);
    for (const iss of pr.closingIssuesReferences.nodes) {
      const issCard = issueArtifact(iss, prCard.id);
      issCard.body = foldComments(issCard.body, iss.comments?.nodes ?? []);
      out.push(issCard);
    }
    reviews.forEach((rv, i) => {
      const comments = rv.comments?.nodes ?? [];

      if (!rv.body.trim() && !comments.some((c) => c.body?.trim())) return;
      const rvCard = reviewArtifact(pr.number, pr.url, rv, i, prCard.id);
      rvCard.body = foldComments(rv.body.trim(), comments);
      out.push(rvCard);
    });
  }
  return out;
}
