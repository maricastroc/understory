import type { DiffResult } from "@git-investigator/core/diff/types";

// `key` = "owner/repo#123" — identity for a PR analysis, so re-running the same PR
// (e.g. after a language flip) updates its entry instead of stacking a duplicate.
export type PrEntry = { key: string; result: DiffResult };

export const entryKey = (r: DiffResult): string => `${r.repo.name ?? r.repo.path}#${r.pr.number}`;
