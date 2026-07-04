import { rankShallow } from "./rank";
import { getRequestToken } from "./token-context";

const API = "https://api.github.com";
const metaCache = new Map<string, GitHubRepoMeta>();
const treeCache = new Map<string, string[]>();

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Caller-supplied PAT (for private repos) wins; fall back to the server env token.
  const token = getRequestToken() ?? process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 429
        ? " — rate limited; set GITHUB_TOKEN in .env.local for higher limits"
        : res.status === 404
          ? " — not found; is the repo public, or is GITHUB_TOKEN set for private access?"
          : "";
    throw new Error(`GitHub API ${res.status}${hint}`);
  }
  return (await res.json()) as T;
}

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

export async function defaultFilesGitHub(
  owner: string,
  repo: string,
  branch: string,
  limit = 5,
): Promise<string[]> {
  try {
    return rankShallow(await getTree(owner, repo, branch), limit);
  } catch {
    return [];
  }
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
  const d = await rest<{ content?: string; encoding?: string }>(
    `/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`,
  );
  if (typeof d.content !== "string") throw new Error(`No file content for ${path}`);
  return d.encoding === "base64" ? Buffer.from(d.content, "base64").toString("utf8") : d.content;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      "Line-level history needs a GitHub token — set GITHUB_TOKEN in .env.local (blame uses the GraphQL API, which requires authentication).",
    );
  }
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GitHub GraphQL: ${json.errors[0].message}`);
  if (!json.data) throw new Error("GitHub GraphQL: empty response");
  return json.data;
}

export type PrReview = {
  author: { login: string } | null;
  state: string;
  body: string;
  submittedAt: string;
};
export type PrIssue = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
};
export type AssociatedPr = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  reviews: { nodes: PrReview[] };
  closingIssuesReferences: { nodes: PrIssue[] };
};

export type BlameCommit = {
  oid: string;
  abbreviatedOid: string;
  messageHeadline: string;
  message: string;
  committedDate: string;
  url: string;
  author: { name: string | null; email: string | null } | null;
  associatedPullRequests: { nodes: AssociatedPr[] };
};

type BlameRange = { startingLine: number; endingLine: number; commit: BlameCommit };

const BLAME_QUERY = `
query Blame($owner:String!, $repo:String!, $ref:String!, $path:String!) {
  repository(owner:$owner, name:$repo) {
    object(expression:$ref) {
      ... on Commit {
        blame(path:$path) {
          ranges {
            startingLine
            endingLine
            commit {
              oid
              abbreviatedOid
              messageHeadline
              message
              committedDate
              url
              author { name email }
              associatedPullRequests(first: 1) {
                nodes {
                  number
                  title
                  body
                  url
                  createdAt
                  reviews(first: 10) { nodes { author { login } state body submittedAt } }
                  closingIssuesReferences(first: 5) { nodes { number title body url createdAt } }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export async function blameLines(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  start: number,
  end: number,
): Promise<BlameCommit[]> {
  const data = await graphql<{
    repository: { object: { blame: { ranges: BlameRange[] } } | null } | null;
  }>(BLAME_QUERY, { owner, repo, ref: branch, path });

  const ranges = data.repository?.object?.blame?.ranges ?? [];
  const byOid = new Map<string, BlameCommit>();
  for (const r of ranges) {
    if (r.endingLine >= start && r.startingLine <= end && !byOid.has(r.commit.oid)) {
      byOid.set(r.commit.oid, r.commit);
    }
  }
  return [...byOid.values()].sort((a, b) => a.committedDate.localeCompare(b.committedDate));
}
