import type { BlameSpan, PrLookup } from "../../types";
import type { GlCommit, GlMr } from "./artifacts";
import { encodePath, glRest, projectId } from "./client";

export type GitLabCommit = GlCommit & { mergeRequests: GlMr[]; prLookup?: PrLookup };

const MAX_ENRICH = 10;

type BlameRange = { commit: RawCommit; lines: string[] };

type RawCommit = {
  id: string;
  short_id?: string;
  title?: string;
  message?: string;
  committed_date: string;
  web_url?: string;
  author_name: string | null;
  author_email: string | null;
};

function toCommit(c: RawCommit, host: string, project: string): GlCommit {
  const message = c.message ?? "";
  return {
    id: c.id,
    short_id: c.short_id ?? c.id.slice(0, 8),
    title: c.title ?? message.split("\n", 1)[0],
    message,
    committed_date: c.committed_date,
    web_url: c.web_url ?? `https://${host}/${project}/-/commit/${c.id}`,
    author_name: c.author_name ?? null,
    author_email: c.author_email ?? null,
  };
}

async function mrsForCommit(host: string, project: string, sha: string): Promise<GlMr[] | null> {
  return glRest<GlMr[]>(
    host,
    `/projects/${projectId(project)}/repository/commits/${sha}/merge_requests`,
  ).catch(() => null);
}

async function enrich(host: string, project: string, commits: GlCommit[]): Promise<GitLabCommit[]> {
  const targets = commits.slice(0, MAX_ENRICH);
  const mrs = await Promise.all(targets.map((c) => mrsForCommit(host, project, c.id)));
  const byId = new Map(targets.map((c, i) => [c.id, mrs[i]]));
  return commits.map((c): GitLabCommit => {
    if (!byId.has(c.id)) return { ...c, mergeRequests: [], prLookup: "skipped" };
    const found = byId.get(c.id);
    if (!found) return { ...c, mergeRequests: [], prLookup: "failed" };
    return { ...c, mergeRequests: found, prLookup: found.length > 0 ? "found" : "none" };
  });
}

export function spansFromGitLabRanges(
  ranges: Array<{
    commit: Pick<RawCommit, "id" | "short_id" | "committed_date" | "author_name">;
    lines: string[];
  }>,
  start: number,
): BlameSpan[] {
  const spans: BlameSpan[] = [];
  let line = start;
  for (const r of ranges) {
    const count = r.lines.length;
    if (count === 0) continue;
    spans.push({
      startLine: line,
      endLine: line + count - 1,
      sha: r.commit.id,
      shortSha: r.commit.short_id ?? r.commit.id.slice(0, 8),
      date: r.commit.committed_date,
      ...(r.commit.author_name ? { author: r.commit.author_name } : {}),
    });
    line += count;
  }
  return spans;
}

export async function blameWindowGitLab(
  host: string,
  project: string,
  ref: string,
  filePath: string,
  start: number,
  end: number,
): Promise<BlameSpan[]> {
  const ranges = await glRest<BlameRange[]>(
    host,
    `/projects/${projectId(project)}/repository/files/${encodePath(filePath)}/blame` +
      `?ref=${encodeURIComponent(ref)}&range[start]=${start}&range[end]=${end}`,
  );
  return spansFromGitLabRanges(ranges, start);
}

export async function blameLinesGitLab(
  host: string,
  project: string,
  branch: string,
  filePath: string,
  start: number,
  end: number,
): Promise<GitLabCommit[]> {
  const ranges = await glRest<BlameRange[]>(
    host,
    `/projects/${projectId(project)}/repository/files/${encodePath(filePath)}/blame` +
      `?ref=${encodeURIComponent(branch)}&range[start]=${start}&range[end]=${end}`,
  );

  const byId = new Map<string, GlCommit>();
  for (const r of ranges) {
    if (!byId.has(r.commit.id)) byId.set(r.commit.id, toCommit(r.commit, host, project));
  }
  const commits = [...byId.values()].sort((a, b) =>
    a.committed_date.localeCompare(b.committed_date),
  );

  return enrich(host, project, commits);
}

export async function fileHistoryGitLab(
  host: string,
  project: string,
  branch: string,
  filePath: string,
  limit = 20,
): Promise<GitLabCommit[]> {
  const rows = await glRest<RawCommit[]>(
    host,
    `/projects/${projectId(project)}/repository/commits` +
      `?ref_name=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}&per_page=${limit}`,
  );
  const commits = rows
    .map((c) => toCommit(c, host, project))
    .sort((a, b) => a.committed_date.localeCompare(b.committed_date));

  return enrich(host, project, commits.slice(-MAX_ENRICH));
}
