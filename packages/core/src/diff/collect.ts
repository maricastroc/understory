import { detectContradictions } from "../collect/contradictions";
import {
  type BlameCommit,
  blameLines,
  expandCommit,
  getPullRequest,
  getPullRequestDiff,
  getRepoMeta,
} from "../collect/github";
import type { Artifact, RepoRef } from "../types";
import { parseUnifiedDiff } from "./parse";
import { clusterByCommit, selectBlameTargets } from "./plan";
import type { BlamedTarget, DiffCluster, DiffCollection } from "./types";

const MAX_DETAILED = 8;
const BLAME_CONCURRENCY = 5;

export function buildClusters(
  blamed: BlamedTarget[],
  byId: Map<string, BlameCommit>,
): DiffCluster[] {
  return clusterByCommit(blamed).map(({ commitId, targets }) => {
    const bc = byId.get(commitId);
    const artifacts: Artifact[] = [];
    if (bc) {
      const seen = new Set<string>();
      const add = (a: Artifact) => {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          artifacts.push(a);
        }
      };
      for (const a of expandCommit(bc)) add(a);
    }
    return {
      commitId,
      targets,
      artifacts,
      contradictions: detectContradictions(artifacts),
      rank: 0,
    };
  });
}

function scoreCluster(c: DiffCluster): number {
  let s = c.targets.length * 0.1;
  if (c.contradictions.length) s += 3;
  if (c.artifacts.some((a) => a.kind === "review")) s += 2;
  if (c.artifacts.some((a) => a.kind === "issue")) s += 1.5;
  if (c.artifacts.some((a) => a.kind === "pull_request")) s += 1;
  return s;
}

export function rankAndBudget(
  clusters: DiffCluster[],
  max = MAX_DETAILED,
): { kept: DiffCluster[]; droppedCount: number } {
  const ranked = clusters
    .map((c) => ({ ...c, rank: scoreCluster(c) }))
    .sort((a, b) => b.rank - a.rank || a.commitId.localeCompare(b.commitId));
  const kept = ranked.slice(0, max);
  return { kept, droppedCount: ranked.length - kept.length };
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      await fn(items[i++]);
    }
  });
  await Promise.all(workers);
}

export async function collectDiff(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<DiffCollection> {
  const meta = await getRepoMeta(owner, repo);
  const repoRef: RepoRef = {
    path: `${owner}/${repo}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };
  const pr = await getPullRequest(owner, repo, prNumber);

  let diffText = "";
  let note: string | undefined;
  try {
    diffText = await getPullRequestDiff(owner, repo, prNumber);
  } catch {
    note =
      "GitHub couldn't return this pull request's diff (it may be too large) — there's nothing to explain here.";
  }

  const parsed = parseUnifiedDiff(diffText);
  const sel = selectBlameTargets(parsed.files);

  const blamed: BlamedTarget[] = [];
  const byId = new Map<string, BlameCommit>();
  await mapLimit(sel.targets, BLAME_CONCURRENCY, async (t) => {
    const commits = await blameLines(
      owner,
      repo,
      pr.baseSha,
      t.path,
      t.range.start,
      t.range.end,
    ).catch(() => [] as BlameCommit[]);
    for (const c of commits) {
      const id = `commit:${c.abbreviatedOid}`;
      byId.set(id, c);
      blamed.push({ target: t, commitId: id });
    }
  });

  blamed.sort(
    (a, b) =>
      a.target.path.localeCompare(b.target.path) ||
      a.target.range.start - b.target.range.start ||
      a.target.range.end - b.target.range.end ||
      a.commitId.localeCompare(b.commitId),
  );

  const all = buildClusters(blamed, byId);
  const { kept, droppedCount } = rankAndBudget(all);

  return {
    repo: repoRef,
    pr,
    clusters: kept,
    triage: {
      filesChanged: parsed.files.length,
      filesConsidered: sel.filesConsidered,
      filesSkipped: sel.filesSkipped,
      targetsBlamed: sel.targets.length,
      clustersFound: all.length,
      clustersDetailed: kept.length,
      truncated: sel.truncated || droppedCount > 0,
    },
    note,
  };
}
