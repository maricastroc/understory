import type { HeadCommit, PrLookup } from "../../types";
import { graphqlResult, rest } from "../github/client";
import type { SpanLike } from "./summarize";

export const MAX_PR_OIDS = 100;

export async function headCommitGitHub(
  owner: string,
  repo: string,
  branch: string,
): Promise<HeadCommit> {
  const d = await rest<{
    commit?: { sha?: string; commit?: { committer?: { date?: string } } };
  }>(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  const sha = d.commit?.sha;
  const date = d.commit?.commit?.committer?.date;
  if (!sha || !date) throw new Error(`Could not resolve the head of ${branch}`);
  return { sha, date };
}

type BlameRange = {
  startingLine: number;
  endingLine: number;
  commit: { oid: string; committedDate: string };
};

export async function blameFilesGitHub(
  owner: string,
  repo: string,
  ref: string,
  paths: string[],
): Promise<Map<string, SpanLike[] | Error>> {
  const out = new Map<string, SpanLike[] | Error>();
  if (paths.length === 0) return out;
  const decls = paths.map((_, i) => `$p${i}:String!`).join(", ");
  const fields = paths
    .map(
      (_, i) =>
        `f${i}: blame(path:$p${i}) { ranges { startingLine endingLine commit { oid committedDate } } }`,
    )
    .join("\n");
  const query = `query MapBlame($owner:String!, $repo:String!, $ref:String!, ${decls}) {
    repository(owner:$owner, name:$repo) {
      object(expression:$ref) { ... on Commit {
${fields}
      } }
    }
  }`;
  const vars: Record<string, unknown> = { owner, repo, ref };
  paths.forEach((p, i) => (vars[`p${i}`] = p));

  const { data, errors } = await graphqlResult<{
    repository: { object: Record<string, { ranges: BlameRange[] } | null> | null } | null;
  }>(query, vars, { attempts: 1, timeoutMs: 25_000 });

  const failed = new Map<string, string>();
  for (const e of errors) {
    const alias = e.path?.find((p) => typeof p === "string" && /^f\d+$/.test(p));
    if (typeof alias === "string") failed.set(alias, e.message);
  }
  const object = data?.repository?.object ?? null;
  paths.forEach((path, i) => {
    const alias = `f${i}`;
    const blame = object?.[alias];
    if (!blame) {
      out.set(path, new Error(failed.get(alias) ?? errors[0]?.message ?? "history unavailable"));
      return;
    }
    out.set(
      path,
      blame.ranges.map((r) => ({
        startLine: r.startingLine,
        endLine: r.endingLine,
        sha: r.commit.oid,
        date: r.commit.committedDate,
      })),
    );
  });
  return out;
}

export async function prLookupsGitHub(
  owner: string,
  repo: string,
  oids: string[],
): Promise<Map<string, PrLookup>> {
  const out = new Map<string, PrLookup>();
  if (oids.length === 0) return out;
  const decls = oids.map((_, i) => `$o${i}:String!`).join(", ");
  const fields = oids
    .map(
      (_, i) =>
        `c${i}: object(expression:$o${i}) { ... on Commit { associatedPullRequests(first: 1) { totalCount } } }`,
    )
    .join("\n");
  const query = `query MapPrs($owner:String!, $repo:String!, ${decls}) {
    repository(owner:$owner, name:$repo) {
${fields}
    }
  }`;
  const vars: Record<string, unknown> = { owner, repo };
  oids.forEach((oid, i) => (vars[`o${i}`] = oid));

  const { data } = await graphqlResult<{
    repository: Record<string, { associatedPullRequests?: { totalCount: number } } | null> | null;
  }>(query, vars, { attempts: 1, timeoutMs: 20_000 });

  oids.forEach((oid, i) => {
    const count = data?.repository?.[`c${i}`]?.associatedPullRequests?.totalCount;
    out.set(oid, count === undefined ? "failed" : count > 0 ? "found" : "none");
  });
  return out;
}
