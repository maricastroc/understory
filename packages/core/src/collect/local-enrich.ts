import type { Artifact, RepoRef } from "../types";
import type { GitCommit } from "./git";
import { type AssociatedPr, type BlameCommit, enrichCommits, expandCommit } from "./github";

const MAX_LOCAL_ENRICH = 10;

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
