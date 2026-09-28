import type { BlameSpan, PrLookup } from "../../types";
import { graphql, rest } from "./client";
import { rememberGitHubBlame, rememberGitHubLookups } from "../history/remember";
import { type Comment, COMMENTS } from "./comments";

export type PrReview = {
  author: { login: string } | null;
  state: string;
  body: string;
  submittedAt: string;
  comments?: { nodes: Comment[] };
};
export type PrIssue = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  state?: string;
  stateReason?: string | null;
  comments?: { nodes: Comment[] };
};
export type AssociatedPr = {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  mergedAt?: string | null;
  comments?: { nodes: Comment[] };
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
  prLookup?: PrLookup;
};

type LeanCommit = Omit<BlameCommit, "associatedPullRequests" | "prLookup">;
type LeanRange = { startingLine: number; endingLine: number; commit: LeanCommit };

const MAX_ENRICH = 10;

const PR_FIELDS = `associatedPullRequests(first: 1) {
  nodes {
    number
    title
    body
    url
    createdAt
    mergedAt
    ${COMMENTS}
    reviews(first: 5) { nodes { author { login } state body submittedAt ${COMMENTS} } }
    closingIssuesReferences(first: 5) { nodes { number title body url createdAt state stateReason ${COMMENTS} } }
  }
}`;

const LEAN_BLAME_QUERY = `
query Blame($owner:String!, $repo:String!, $ref:String!, $path:String!, $blob:String!) {
  repository(owner:$owner, name:$repo) {
    file: object(expression:$blob) { oid }
    object(expression:$ref) {
      ... on Commit {
        oid
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

export async function enrichCommits(
  owner: string,
  repo: string,
  oids: string[],
): Promise<Map<string, AssociatedPr[] | null>> {
  const out = new Map<string, AssociatedPr[] | null>();
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
    const found = data.repository?.[`c${i}`];
    out.set(oid, found ? (found.associatedPullRequests?.nodes ?? []) : null);
  });
  return out;
}

export function attachEnrichment(
  commits: LeanCommit[],
  targets: ReadonlySet<string>,
  enrichment: Map<string, AssociatedPr[] | null> | null,
): BlameCommit[] {
  return commits.map((c) => {
    if (!targets.has(c.oid)) {
      return { ...c, associatedPullRequests: { nodes: [] }, prLookup: "skipped" };
    }
    const prs = enrichment?.get(c.oid);
    if (!prs) return { ...c, associatedPullRequests: { nodes: [] }, prLookup: "failed" };
    return {
      ...c,
      associatedPullRequests: { nodes: prs },
      prLookup: prs.length > 0 ? "found" : "none",
    };
  });
}

async function enrichAll(
  owner: string,
  repo: string,
  commits: LeanCommit[],
  targets: LeanCommit[],
): Promise<BlameCommit[]> {
  const enrichment = await enrichCommits(
    owner,
    repo,
    targets.map((c) => c.oid),
  ).catch(() => null);
  return attachEnrichment(commits, new Set(targets.map((c) => c.oid)), enrichment);
}

async function blameFile(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<{
  oid: string | null;
  ranges: LeanRange[];
  blob: string | null;
  remembered: Promise<void>;
}> {
  const data = await graphql<{
    repository: {
      file: { oid?: string } | null;
      object: { oid?: string; blame: { ranges: LeanRange[] } } | null;
    } | null;
  }>(LEAN_BLAME_QUERY, { owner, repo, ref, path, blob: `${ref}:${path}` });
  const object = data.repository?.object;
  const ranges = object?.blame?.ranges ?? [];
  const blob = data.repository?.file?.oid ?? null;
  const remembered =
    blob && ranges.length
      ? rememberGitHubBlame(
          owner,
          repo,
          path,
          blob,
          ranges.map((r) => ({
            startLine: r.startingLine,
            endLine: r.endingLine,
            sha: r.commit.oid,
            date: r.commit.committedDate,
          })),
        ).catch(() => {})
      : Promise.resolve();
  return { oid: object?.oid ?? null, ranges, blob, remembered };
}

export async function blameLinesAt(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  start: number,
  end: number,
): Promise<{ oid: string | null; commits: BlameCommit[] }> {
  const { oid, ranges, blob, remembered } = await blameFile(owner, repo, ref, path);

  const byOid = new Map<string, LeanCommit>();
  for (const r of ranges) {
    if (r.endingLine >= start && r.startingLine <= end && !byOid.has(r.commit.oid)) {
      byOid.set(r.commit.oid, r.commit);
    }
  }
  const commits = [...byOid.values()].sort((a, b) =>
    a.committedDate.localeCompare(b.committedDate),
  );

  const enriched = await enrichAll(owner, repo, commits, commits.slice(0, MAX_ENRICH));
  if (blob) {
    const lookups = new Map(enriched.map((c) => [c.oid, c.prLookup ?? "skipped"] as const));
    void remembered
      .then(() => rememberGitHubLookups(owner, repo, path, blob, lookups))
      .catch(() => {});
  }
  return { oid, commits: enriched };
}

export function spansFromGitHubRanges(
  ranges: Array<{
    startingLine: number;
    endingLine: number;
    commit: Pick<LeanCommit, "oid" | "abbreviatedOid" | "committedDate" | "author">;
  }>,
  start: number,
  end: number,
): BlameSpan[] {
  return ranges
    .filter((r) => r.endingLine >= start && r.startingLine <= end)
    .map((r) => ({
      startLine: Math.max(r.startingLine, start),
      endLine: Math.min(r.endingLine, end),
      sha: r.commit.oid,
      shortSha: r.commit.abbreviatedOid,
      date: r.commit.committedDate,
      ...(r.commit.author?.name ? { author: r.commit.author.name } : {}),
    }))
    .sort((a, b) => a.startLine - b.startLine);
}

export async function blameWindowGitHub(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  start: number,
  end: number,
): Promise<BlameSpan[]> {
  const { ranges } = await blameFile(owner, repo, ref, path);
  return spansFromGitHubRanges(ranges, start, end);
}

type RestCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name?: string; email?: string; date?: string } | null };
};

export async function fileHistoryGitHub(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  limit = 20,
): Promise<BlameCommit[]> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const rows = await rest<RestCommit[]>(
    `/repos/${owner}/${repo}/commits?path=${encoded}&sha=${encodeURIComponent(branch)}&per_page=${limit}`,
  );
  const commits: LeanCommit[] = rows.map((c) => ({
    oid: c.sha,
    abbreviatedOid: c.sha.slice(0, 7),
    messageHeadline: c.commit.message.split("\n", 1)[0],
    message: c.commit.message,
    committedDate: c.commit.author?.date ?? "",
    url: c.html_url,
    author: { name: c.commit.author?.name ?? null, email: c.commit.author?.email ?? null },
  }));
  commits.sort((a, b) => a.committedDate.localeCompare(b.committedDate));

  return enrichAll(owner, repo, commits, commits.slice(-MAX_ENRICH));
}
