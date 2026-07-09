import { rest } from "./client";

const metaCache = new Map<string, GitHubRepoMeta>();

export function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  const s = input.trim();
  if (!s || s.startsWith(".") || s.startsWith("/") || s.startsWith("~")) return null;
  let m = s.match(
    /^(?:https?:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i,
  );
  if (m) return { owner: m[1], repo: m[2] };
  m = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

export type GitHubRepoMeta = {
  name: string;
  branch: string;
  htmlUrl: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
  topics: string[];
};

export async function getRepoMeta(owner: string, repo: string): Promise<GitHubRepoMeta> {
  const key = `${owner}/${repo}`;

  const hit = metaCache.get(key);

  if (hit) return hit;

  const d = await rest<{
    full_name: string;
    default_branch: string;
    html_url: string;
    private: boolean;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string | null;
    topics?: string[];
  }>(`/repos/${owner}/${repo}`);

  const meta: GitHubRepoMeta = {
    name: d.full_name,
    branch: d.default_branch,
    htmlUrl: d.html_url,
    private: d.private,
    description: d.description,
    language: d.language,
    stars: d.stargazers_count,
    forks: d.forks_count,
    openIssues: d.open_issues_count,
    pushedAt: d.pushed_at,
    topics: d.topics ?? [],
  };

  metaCache.set(key, meta);

  return meta;
}
