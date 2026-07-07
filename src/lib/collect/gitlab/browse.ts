import { rankByHistory, rankShallow } from "../rank";
import { encodePath, glRest, glRestPaged, glRestRaw, projectId } from "./client";

const treeCache = new Map<string, string[]>();
const churnCache = new Map<string, Map<string, number>>();

async function getTree(host: string, project: string, branch: string): Promise<string[]> {
  const key = `${host}/${project}@${branch}`;
  const hit = treeCache.get(key);
  if (hit) return hit;

  const entries = await glRestPaged<{ type: string; path: string }>(
    host,
    `/projects/${projectId(project)}/repository/tree?recursive=true&ref=${encodeURIComponent(branch)}`,
  );
  const files = entries.filter((t) => t.type === "blob").map((t) => t.path);
  treeCache.set(key, files);
  return files;
}

async function recentChurn(
  host: string,
  project: string,
  branch: string,
): Promise<Map<string, number>> {
  const key = `${host}/${project}@${branch}`;
  const hit = churnCache.get(key);
  if (hit) return hit;

  const counts = new Map<string, number>();
  const commits = await glRest<Array<{ id: string; parent_ids?: string[] }>>(
    host,
    `/projects/${projectId(project)}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=40`,
  );
  const shas = commits
    .filter((c) => (c.parent_ids?.length ?? 1) <= 1)
    .slice(0, 12)
    .map((c) => c.id);

  const details = await Promise.all(
    shas.map((sha) =>
      glRest<Array<{ new_path: string }>>(
        host,
        `/projects/${projectId(project)}/repository/commits/${sha}/diff`,
      ).catch(() => null),
    ),
  );
  for (const files of details) {
    for (const f of files ?? []) counts.set(f.new_path, (counts.get(f.new_path) ?? 0) + 1);
  }

  churnCache.set(key, counts);
  return counts;
}

export async function defaultFilesGitLab(
  host: string,
  project: string,
  branch: string,
  limit = 5,
): Promise<string[]> {
  let tree: string[];
  try {
    tree = await getTree(host, project, branch);
  } catch {
    return [];
  }

  try {
    const churn = await recentChurn(host, project, branch);
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
    //
  }

  return rankShallow(tree, limit);
}

export async function searchFilesGitLab(
  host: string,
  project: string,
  branch: string,
  query: string,
  limit = 25,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = new Set<string>();

  try {
    const ql = q.toLowerCase();
    for (const f of await getTree(host, project, branch)) {
      if (f.toLowerCase().includes(ql)) results.add(f);
      if (results.size >= limit) break;
    }
  } catch {
    //
  }

  if (results.size < limit) {
    try {
      const found = await glRest<Array<{ path: string }>>(
        host,
        `/projects/${projectId(project)}/search?scope=blobs&search=${encodeURIComponent(q)}&ref=${encodeURIComponent(branch)}`,
      );
      for (const it of found) if (it.path) results.add(it.path);
    } catch {
      //
    }
  }

  return [...results].slice(0, limit);
}

export async function getFileContentGitLab(
  host: string,
  project: string,
  branch: string,
  filePath: string,
): Promise<string> {
  return glRestRaw(
    host,
    `/projects/${projectId(project)}/repository/files/${encodePath(filePath)}/raw?ref=${encodeURIComponent(branch)}`,
  );
}

export async function getFileSizeGitLab(
  host: string,
  project: string,
  branch: string,
  filePath: string,
): Promise<number> {
  const d = await glRest<{ size?: number }>(
    host,
    `/projects/${projectId(project)}/repository/files/${encodePath(filePath)}?ref=${encodeURIComponent(branch)}`,
  );
  return d.size ?? 0;
}
