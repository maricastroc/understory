import type { RecentRepo } from "../composer/types/recent-repo";
import { repoDisplayName } from "../shell/repo-display-name";
import { repoKey } from "./repo-key";
import type { Entry } from "./use-investigation";

export function recentRepos(history: Entry[], limit = 4): RecentRepo[] {
  const byKey = new Map<string, RecentRepo>();
  for (const entry of history) {
    const path = entry.form.repoPath;
    const key = repoKey(path);
    const hit = byKey.get(key);
    if (hit) hit.investigations += 1;
    else
      byKey.set(key, {
        path,
        name: repoDisplayName(entry.result.evidence.repo.name ?? path),
        investigations: 1,
      });
  }
  return [...byKey.values()].slice(0, limit);
}
