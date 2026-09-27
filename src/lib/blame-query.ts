import { MAX_BLAME_WINDOW } from "@git-investigator/core/collect/blame-window";
import { isCommitSha } from "@git-investigator/core/collect/sha";

export type BlameQuery = { repo: string; path: string; ref: string; start: number; end: number };

const LINE = /^[1-9]\d{0,6}$/;

export function parseBlameQuery(params: URLSearchParams): BlameQuery | { error: string } {
  const repo = params.get("repo")?.trim() ?? "";
  const path = params.get("path")?.trim() ?? "";
  const ref = params.get("ref")?.trim() ?? "";
  const rawStart = params.get("start") ?? "";
  const rawEnd = params.get("end") ?? "";

  if (!repo || !path) return { error: "repo and path are required" };
  if (!ref) return { error: "ref is required — blame is only served for a pinned commit" };
  if (!isCommitSha(ref)) return { error: "ref must be a commit sha" };
  if (!LINE.test(rawStart) || !LINE.test(rawEnd)) {
    return { error: "start and end must be positive line numbers" };
  }

  const start = Number(rawStart);
  const end = Number(rawEnd);
  if (end < start) return { error: "end must not be before start" };
  if (end - start + 1 > MAX_BLAME_WINDOW) {
    return { error: `blame is limited to ${MAX_BLAME_WINDOW} lines per request` };
  }

  return { repo, path, ref, start, end };
}
