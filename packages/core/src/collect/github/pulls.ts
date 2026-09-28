import { rest, restDiff } from "./client";

export type PullMeta = {
  number: number;
  title: string;
  url: string;
  baseSha: string;
  headSha: string;
  createdAt?: string;
  mergedAt?: string | null;
};

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<PullMeta> {
  const pr = await rest<{
    number: number;
    title: string;
    html_url: string;
    base: { sha: string };
    head: { sha: string };
    created_at?: string;
    merged_at?: string | null;
  }>(`/repos/${owner}/${repo}/pulls/${number}`);
  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
    ...(pr.created_at ? { createdAt: pr.created_at } : {}),
    ...(pr.merged_at !== undefined ? { mergedAt: pr.merged_at } : {}),
  };
}

export function getPullRequestDiff(owner: string, repo: string, number: number): Promise<string> {
  return restDiff(`/repos/${owner}/${repo}/pulls/${number}`);
}
