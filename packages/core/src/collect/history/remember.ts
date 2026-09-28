import type { PrLookup } from "../../types";
import { readSummaries, writeSummary } from "./history-cache";
import { githubRepoKey } from "./repo-key";
import { type SpanLike, summarizeSpans, withLookups } from "./summarize";

export async function rememberGitHubBlame(
  owner: string,
  repo: string,
  path: string,
  blobSha: string,
  spans: SpanLike[],
): Promise<void> {
  const key = githubRepoKey(owner, repo);
  if ((await readSummaries(key, [{ path, blobSha }])).has(path)) return;
  await writeSummary(key, path, blobSha, summarizeSpans(spans));
}

export async function rememberGitHubLookups(
  owner: string,
  repo: string,
  path: string,
  blobSha: string,
  lookups: ReadonlyMap<string, PrLookup>,
): Promise<void> {
  const key = githubRepoKey(owner, repo);
  const summary = (await readSummaries(key, [{ path, blobSha }])).get(path);
  if (!summary) return;
  const settled = new Map([...lookups].filter(([, v]) => v === "found" || v === "none"));
  if (settled.size === 0) return;
  await writeSummary(key, path, blobSha, withLookups(summary, settled));
}
