import type { Artifact } from "../../types";
import { commitArtifact, issueArtifact, prArtifact, reviewArtifact } from "./artifacts";
import type { BlameCommit } from "./blame";
import { foldComments } from "./comments";

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

      if (!rv.body.trim() && !comments.some((c) => c.body?.trim())) return;
      const rvCard = reviewArtifact(pr.number, pr.url, rv, i, prCard.id);
      rvCard.body = foldComments(rv.body.trim(), comments);
      out.push(rvCard);
    });
  }
  return out;
}
