import { repoKey } from "./repo-key";
import type { Entry } from "./use-investigation";

export type CasePaths = { ordered: string[]; counts: Map<string, number> };

export function casePaths(history: Entry[], repoPath: string): CasePaths {
  const key = repoKey(repoPath);
  const counts = new Map<string, number>();
  const ordered: string[] = [];
  for (const entry of history) {
    if (repoKey(entry.form.repoPath) !== key) continue;
    const file = entry.result.evidence.location?.file;
    if (!file) continue;
    counts.set(file, (counts.get(file) ?? 0) + 1);
    if (!ordered.includes(file)) ordered.push(file);
  }
  return { ordered, counts };
}
