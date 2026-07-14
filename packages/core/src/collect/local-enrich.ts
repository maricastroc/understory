import type { Artifact, RepoRef } from "../types";
import type { GitCommit } from "./git";
import { type AssociatedPr, type BlameCommit, enrichCommits, expandCommit } from "./github";

// The local flow's line history is the gold standard (git log -L), but commits alone rarely
// carry the "why" — that lives in the PR/issue/review discussion. When the checkout has a
// GitHub remote (and a token), each local commit is enriched through the SAME path the blame
// collector uses, so a local investigation gets full line history AND the discussion.
const MAX_LOCAL_ENRICH = 10;

// A local commit dressed as a BlameCommit so expandCommit can enrich it exactly like the
// blame path — same ids, same folded discussion, so the two collectors never drift.
function toBlameCommit(c: GitCommit, repo: RepoRef, prs: AssociatedPr[]): BlameCommit {
  return {
    oid: c.sha,
    abbreviatedOid: c.shortSha,
    messageHeadline: c.subject,
    message: c.body ? `${c.subject}\n\n${c.body}` : c.subject,
    committedDate: c.date,
    url: repo.remoteUrl ? `${repo.remoteUrl}/commit/${c.sha}` : "",
    author: { name: c.author.name ?? null, email: c.author.email ?? null },
    associatedPullRequests: { nodes: prs },
  };
}

// Pure: merge local commits with an enrichment map into the trail the blame path produces
// (commit → PR → closing issues → reviews, discussion folded in), deduped and date-sorted.
// A commit with no enrichment collapses to just its commit artifact — identical to the
// commits-only fallback, so an empty map degrades cleanly.
export function buildLocalArtifacts(
  commits: GitCommit[],
  repo: RepoRef,
  enrichment: Map<string, AssociatedPr[]>,
): Artifact[] {
  const artifacts: Artifact[] = [];
  const seen = new Set<string>();
  for (const c of commits) {
    for (const a of expandCommit(toBlameCommit(c, repo, enrichment.get(c.sha) ?? []))) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        artifacts.push(a);
      }
    }
  }
  return artifacts.sort((a, b) => a.date.localeCompare(b.date));
}

// Resolve each commit's sha to its PR trail via the shared enrichment, capping the request
// like the blame path. Any failure (no token, network, private repo) collapses to an empty
// map, so the caller still gets the commits — never worse than commits-only.
export async function enrichLocalCommits(
  owner: string,
  repo: string,
  commits: GitCommit[],
  repoRef: RepoRef,
): Promise<Artifact[]> {
  const enrichment = await enrichCommits(
    owner,
    repo,
    commits.slice(-MAX_LOCAL_ENRICH).map((c) => c.sha),
  ).catch(() => new Map<string, AssociatedPr[]>());
  return buildLocalArtifacts(commits, repoRef, enrichment);
}
