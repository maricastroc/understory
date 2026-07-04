import { rankShallow } from "./rank";
import { resolveToken } from "./token-context";

const API = "https://api.github.com";
const metaCache = new Map<string, GitHubRepoMeta>();
const treeCache = new Map<string, string[]>();

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = resolveToken();
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
  if (!resolveToken()) {
    throw new Error(
      "Line-level history needs a GitHub token — set GITHUB_TOKEN (or add a token in the UI for private repos); blame uses the GraphQL API, which requires authentication.",
    );
  }

  let lastError: Error = new Error("GitHub GraphQL request failed");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 22_000);
    try {
      const res = await fetch(`${API}/graphql`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      });
      if (res.status >= 500) {
        lastError = new Error(`GitHub GraphQL ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
      const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) throw new Error(`GitHub GraphQL: ${json.errors[0].message}`);
      if (!json.data) throw new Error("GitHub GraphQL: empty response");
      return json.data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === "AbortError") {
        lastError = new Error("GitHub GraphQL timeout");
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
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

type LeanCommit = Omit<BlameCommit, "associatedPullRequests">;
type LeanRange = { startingLine: number; endingLine: number; commit: LeanCommit };

const MAX_ENRICH = 10;

const PR_FIELDS = `associatedPullRequests(first: 1) {
  nodes {
    number
    title
    body
    url
    createdAt
    reviews(first: 5) { nodes { author { login } state body submittedAt } }
    closingIssuesReferences(first: 5) { nodes { number title body url createdAt } }
  }
}`;

const LEAN_BLAME_QUERY = `
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
            }
          }
        }
      }
    }
  }
}`;

async function enrichCommits(
  owner: string,
  repo: string,
  oids: string[],
): Promise<Map<string, AssociatedPr[]>> {
  const out = new Map<string, AssociatedPr[]>();
  if (oids.length === 0) return out;

  const varDecls = oids.map((_, i) => `$oid${i}:String!`).join(", ");
  const fields = oids
    .map((_, i) => `c${i}: object(expression:$oid${i}) { ... on Commit { ${PR_FIELDS} } }`)
    .join("\n");
  const query = `query Enrich($owner:String!, $repo:String!, ${varDecls}) {
    repository(owner:$owner, name:$repo) {
${fields}
    }
  }`;
  const vars: Record<string, unknown> = { owner, repo };
  oids.forEach((oid, i) => (vars[`oid${i}`] = oid));

  const data = await graphql<{
    repository: Record<string, { associatedPullRequests: { nodes: AssociatedPr[] } } | null> | null;
  }>(query, vars);

  oids.forEach((oid, i) => {
    out.set(oid, data.repository?.[`c${i}`]?.associatedPullRequests?.nodes ?? []);
  });
  return out;
}

export async function blameLines(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  start: number,
  end: number,
): Promise<BlameCommit[]> {
  const data = await graphql<{
    repository: { object: { blame: { ranges: LeanRange[] } } | null } | null;
  }>(LEAN_BLAME_QUERY, { owner, repo, ref: branch, path });

  const ranges = data.repository?.object?.blame?.ranges ?? [];
  const byOid = new Map<string, LeanCommit>();
  for (const r of ranges) {
    if (r.endingLine >= start && r.startingLine <= end && !byOid.has(r.commit.oid)) {
      byOid.set(r.commit.oid, r.commit);
    }
  }
  const commits = [...byOid.values()].sort((a, b) =>
    a.committedDate.localeCompare(b.committedDate),
  );

  const enrichment = await enrichCommits(
    owner,
    repo,
    commits.slice(0, MAX_ENRICH).map((c) => c.oid),
  ).catch(() => new Map<string, AssociatedPr[]>());

  return commits.map((c) => ({
    ...c,
    associatedPullRequests: { nodes: enrichment.get(c.oid) ?? [] },
  }));
}
