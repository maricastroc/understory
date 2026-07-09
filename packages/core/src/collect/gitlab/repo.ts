import { glRest, projectId } from "./client";

const metaCache = new Map<string, GitLabProjectMeta>();

export function gitlabHosts(): Set<string> {
  const set = new Set<string>(["gitlab.com"]);
  for (const h of (process.env.GITLAB_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    set.add(h);
  }
  return set;
}

export function parseGitLabRepo(input: string): { host: string; project: string } | null {
  const s = input.trim();
  if (!s) return null;

  let host: string;
  let rest: string;
  let m = s.match(/^https?:\/\/([^/]+)\/(.+)$/i);
  if (m) {
    host = m[1];
    rest = m[2];
  } else if ((m = s.match(/^git@([^:]+):(.+)$/))) {
    host = m[1];
    rest = m[2];
  } else {
    return null;
  }

  host = host.toLowerCase();
  if (!gitlabHosts().has(host)) return null;

  let project = rest.replace(/^\/+/, "");
  const dash = project.indexOf("/-/");
  if (dash !== -1) project = project.slice(0, dash);
  project = project.replace(/\.git$/, "").replace(/\/+$/, "");
  if (!project.includes("/")) return null;

  return { host, project };
}

export type GitLabProjectMeta = {
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

async function topLanguage(host: string, project: string): Promise<string | null> {
  try {
    const langs = await glRest<Record<string, number>>(
      host,
      `/projects/${projectId(project)}/languages`,
    );
    const top = Object.entries(langs).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  } catch {
    return null;
  }
}

export async function getProjectMeta(host: string, project: string): Promise<GitLabProjectMeta> {
  const key = `${host}/${project}`;
  const hit = metaCache.get(key);
  if (hit) return hit;

  const d = await glRest<{
    path_with_namespace: string;
    default_branch: string | null;
    web_url: string;
    visibility: string;
    description: string | null;
    star_count: number;
    forks_count: number;
    open_issues_count?: number;
    last_activity_at: string | null;
    topics?: string[];
    tag_list?: string[];
  }>(host, `/projects/${projectId(project)}`);

  const meta: GitLabProjectMeta = {
    name: d.path_with_namespace,
    branch: d.default_branch ?? "main",
    htmlUrl: d.web_url,
    private: d.visibility !== "public",
    description: d.description,
    language: await topLanguage(host, project),
    stars: d.star_count,
    forks: d.forks_count,
    openIssues: d.open_issues_count ?? 0,
    pushedAt: d.last_activity_at,
    topics: d.topics ?? d.tag_list ?? [],
  };

  metaCache.set(key, meta);
  return meta;
}
