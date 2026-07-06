import { rankByHistory, rankShallow } from "../rank";
import { rest, restRaw } from "./client";

const treeCache = new Map<string, string[]>();
const churnCache = new Map<string, Map<string, number>>();

async function getTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const key = `${owner}/${repo}@${branch}`;

  const hit = treeCache.get(key);

  if (hit) return hit;

  const d = await rest<{ tree?: Array<{ type: string; path: string }> }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );

  const files = (d.tree ?? []).filter((t) => t.type === "blob").map((t) => t.path);

  treeCache.set(key, files);

  return files;
}

/**
 * Tally how many of the most recent (non-merge) commits touched each file. A file with
 * more hits has a more layered history, which is what makes it a rich investigation
 * target. Bounded to a handful of commit-detail calls and cached per repo@branch.
 */
async function recentChurn(
  owner: string,
  repo: string,
  branch: string,
): Promise<Map<string, number>> {
  const key = `${owner}/${repo}@${branch}`;

  const hit = churnCache.get(key);
  if (hit) return hit;

  const counts = new Map<string, number>();

  const commits = await rest<Array<{ sha: string; parents?: unknown[] }>>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=40`,
  );
  const shas = commits
    .filter((c) => (c.parents?.length ?? 1) <= 1)
    .slice(0, 12)
    .map((c) => c.sha);

  const details = await Promise.all(
    shas.map((sha) =>
      rest<{ files?: Array<{ filename: string }> }>(`/repos/${owner}/${repo}/commits/${sha}`).catch(
        () => null,
      ),
    ),
  );
  for (const d of details) {
    for (const f of d?.files ?? []) counts.set(f.filename, (counts.get(f.filename) ?? 0) + 1);
  }

  churnCache.set(key, counts);

  return counts;
}

export async function defaultFilesGitHub(
  owner: string,
  repo: string,
  branch: string,
  limit = 5,
): Promise<string[]> {
  let tree: string[];
  try {
    tree = await getTree(owner, repo, branch);
  } catch {
    return [];
  }

  try {
    const churn = await recentChurn(owner, repo, branch);

    const present = new Set(tree);

    const scoped = new Map([...churn].filter(([p]) => present.has(p)));

    const picks = rankByHistory(tree, scoped, limit);

    if (picks.length < limit) {
      const seen = new Set(picks);
      for (const p of rankShallow(tree, limit * 3)) {
        if (picks.length >= limit) break;
        if (!seen.has(p)) picks.push(p);
      }
    }
    if (picks.length) return picks;
  } catch {
    /* churn unavailable (rate limit / empty repo) — fall back to structural ranking */
  }

  return rankShallow(tree, limit);
}

export async function searchFilesGitHub(
  owner: string,
  repo: string,
  branch: string,
  query: string,
  limit = 25,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = new Set<string>();

  try {
    const ql = q.toLowerCase();
    for (const f of await getTree(owner, repo, branch)) {
      if (f.toLowerCase().includes(ql)) results.add(f);
      if (results.size >= limit) break;
    }
  } catch {
    /* tree too large / not found */
  }

  if (results.size < limit) {
    try {
      const found = await rest<{ items?: Array<{ path: string }> }>(
        `/search/code?q=${encodeURIComponent(`${q} repo:${owner}/${repo}`)}&per_page=${limit}`,
      );
      for (const it of found.items ?? []) results.add(it.path);
    } catch {
      /* code search requires auth / is rate-limited — filename matches still work */
    }
  }

  return [...results].slice(0, limit);
}

export async function getFileContentGitHub(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  return restRaw(`/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`);
}

export async function getFileSizeGitHub(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<number> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const d = await rest<{ size?: number }>(
    `/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`,
  );
  return d.size ?? 0;
}
