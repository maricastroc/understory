import type { ShownFile, ShownReason, TreeEntry } from "../../types";
import { isNoise, rankByHistory, rankShallow } from "../rank";

export const SHOWN_LIMIT = 15;
export const CASE_LIMIT = 5;

export function pickShownFiles(input: {
  entries: TreeEntry[];
  churn: ReadonlyMap<string, number>;
  cases: string[];
  limit?: number;
}): ShownFile[] {
  const limit = input.limit ?? SHOWN_LIMIT;
  const byPath = new Map(input.entries.map((e) => [e.path, e]));
  const paths = input.entries.map((e) => e.path).filter((p) => !isNoise(p));
  const shown: ShownFile[] = [];
  const seen = new Set<string>();

  const add = (path: string, reason: ShownReason) => {
    const entry = byPath.get(path);
    if (!entry || seen.has(path) || shown.length >= limit || isNoise(path)) return false;
    seen.add(path);
    shown.push({
      path,
      blobSha: entry.sha,
      size: entry.size,
      reason,
      churn: input.churn.get(path) ?? 0,
    });
    return true;
  };

  let cases = 0;
  for (const path of input.cases) {
    if (cases >= CASE_LIMIT) break;
    if (add(path, "case")) cases++;
  }
  for (const path of rankByHistory(paths, new Map(input.churn), limit)) add(path, "recent");
  for (const path of rankShallow(paths, limit * 3)) add(path, "path");
  return shown;
}
