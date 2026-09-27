import type { PrLookup } from "../../types";
import { resolveRepo } from "../git";
import { parseGitHubRepo } from "../github/repo";
import { resolveToken } from "../token-context";
import { blameFilesGitHub, MAX_PR_OIDS, prLookupsGitHub } from "./github-history";
import { blameFileLocal, shallowCommitsLocal } from "./local-history";
import type { HistorySource } from "./map-histories";
import { githubRepoKey, localRepoKey } from "./repo-key";
import type { SpanLike } from "./summarize";

export function githubHistorySource(owner: string, repo: string): HistorySource {
  return {
    key: githubRepoKey(owner, repo),
    blame: (ref, paths) => blameFilesGitHub(owner, repo, ref, paths),
    lookups: resolveToken() ? (oids) => prLookupsGitHub(owner, repo, oids) : null,
    maxLookups: MAX_PR_OIDS,
  };
}

export async function localGitHubRemote(
  repoPath: string,
): Promise<{ owner: string; repo: string } | null> {
  const ref = await resolveRepo(repoPath);
  return ref.remoteUrl ? parseGitHubRepo(ref.remoteUrl) : null;
}

export async function localHistorySource(repoPath: string): Promise<HistorySource> {
  const [shallow, remote] = await Promise.all([
    shallowCommitsLocal(repoPath),
    localGitHubRemote(repoPath),
  ]);
  const lookups =
    remote && resolveToken()
      ? (oids: string[]): Promise<Map<string, PrLookup>> =>
          prLookupsGitHub(remote.owner, remote.repo, oids)
      : null;
  return {
    key: localRepoKey(repoPath),
    blame: async (ref, paths) => {
      const out = new Map<string, SpanLike[] | Error>();
      for (const path of paths) {
        try {
          const spans = await blameFileLocal(repoPath, ref, path);
          out.set(
            path,
            spans.map((s) => ({ ...s, boundary: shallow.has(s.sha) })),
          );
        } catch (e) {
          out.set(path, e instanceof Error ? e : new Error(String(e)));
        }
      }
      return out;
    },
    lookups,
    maxLookups: MAX_PR_OIDS,
  };
}
