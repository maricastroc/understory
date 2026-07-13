import { rest, restDiff } from "./client";

export type PullMeta = {
  number: number;
  title: string;
  url: string;
  baseSha: string;
  headSha: string;
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
  }>(`/repos/${owner}/${repo}/pulls/${number}`);
  return { number: pr.number, title: pr.title, url: pr.html_url, baseSha: pr.base.sha, headSha: pr.head.sha };
}

// The unified diff, straight from GitHub — parsed line-for-line downstream.
export function getPullRequestDiff(owner: string, repo: string, number: number): Promise<string> {
  return restDiff(`/repos/${owner}/${repo}/pulls/${number}`);
}
