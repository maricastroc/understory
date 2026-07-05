import { graphql } from "./client";

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
  state?: string;
  stateReason?: string | null;
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
    closingIssuesReferences(first: 5) { nodes { number title body url createdAt state stateReason } }
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
