import type { Artifact, PrLookup, RepoRef } from "../types";
import type { GitCommit } from "./git";
import { type AssociatedPr, type BlameCommit, enrichCommits, expandCommit } from "./github";

const MAX_LOCAL_ENRICH = 10;

function toBlameCommit(
  c: GitCommit,
  repo: RepoRef,
  prs: AssociatedPr[],
  prLookup: PrLookup,
): BlameCommit {
  return {
    oid: c.sha,
    abbreviatedOid: c.shortSha,
    messageHeadline: c.subject,
    message: c.body ? `${c.subject}\n\n${c.body}` : c.subject,
    committedDate: c.date,
    url: repo.remoteUrl ? `${repo.remoteUrl}/commit/${c.sha}` : "",
    author: { name: c.author.name ?? null, email: c.author.email ?? null },
    associatedPullRequests: { nodes: prs },
    prLookup,
  };
}

function lookupFor(
  sha: string,
  enrichment: Map<string, AssociatedPr[] | null>,
  attempted: ReadonlySet<string>,
  failed: boolean,
): { prs: AssociatedPr[]; prLookup: PrLookup } {
  if (!attempted.has(sha)) return { prs: [], prLookup: "skipped" };
  const prs = failed ? null : enrichment.get(sha);
  if (!prs) return { prs: [], prLookup: "failed" };
  return { prs, prLookup: prs.length > 0 ? "found" : "none" };
}

export function buildLocalArtifacts(
  commits: GitCommit[],
  repo: RepoRef,
  enrichment: Map<string, AssociatedPr[] | null>,
  attempted: ReadonlySet<string> = new Set(enrichment.keys()),
  failed = false,
): Artifact[] {
  const artifacts: Artifact[] = [];
  const seen = new Set<string>();
  for (const c of commits) {
    const { prs, prLookup } = lookupFor(c.sha, enrichment, attempted, failed);
    for (const a of expandCommit(toBlameCommit(c, repo, prs, prLookup))) {
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
  const targets = commits.slice(-MAX_LOCAL_ENRICH).map((c) => c.sha);
  const enrichment = await enrichCommits(owner, repo, targets).catch(() => null);
  return buildLocalArtifacts(
    commits,
    repoRef,
    enrichment ?? new Map(),
    new Set(targets),
    enrichment === null,
  );
}
