import type { DiffResult } from "@git-investigator/core/diff/types";

export type PrEntry = { key: string; result: DiffResult };

export const entryKey = (r: DiffResult): string => `${r.repo.name ?? r.repo.path}#${r.pr.number}`;
