import type { TreeOverview } from "../../types";
import { recentChurnGitHub, treeEntriesGitHub } from "../github/browse";
import { RECENT_COMMITS } from "../rank";
import { resolveToken } from "../token-context";
import { headCommitGitHub } from "./github-history";
import {
  headCommitLocal,
  recentChurnLocal,
  shallowCommitsLocal,
  treeEntriesLocal,
} from "./local-history";
import { pickShownFiles } from "./pick-files";
import { localGitHubRemote } from "./sources";

export async function overviewGitHub(
  owner: string,
  repo: string,
  branch: string,
  cases: string[],
): Promise<TreeOverview> {
  const head = await headCommitGitHub(owner, repo, branch);
  const [tree, churn] = await Promise.all([
    treeEntriesGitHub(owner, repo, head.sha),
    recentChurnGitHub(owner, repo, branch).catch(() => new Map<string, number>()),
  ]);
  return {
    head,
    total: tree.entries.length,
    truncated: tree.truncated,
    shallow: false,
    mappable: !!resolveToken(),
    prData: resolveToken() ? "github" : "none",
    recentCommits: RECENT_COMMITS,
    files: pickShownFiles({ entries: tree.entries, churn, cases }),
  };
}

export async function overviewLocal(repoPath: string, cases: string[]): Promise<TreeOverview> {
  const [head, entries, churn, shallow, remote] = await Promise.all([
    headCommitLocal(repoPath),
    treeEntriesLocal(repoPath),
    recentChurnLocal(repoPath),
    shallowCommitsLocal(repoPath),
    localGitHubRemote(repoPath),
  ]);
  return {
    head,
    total: entries.length,
    truncated: false,
    shallow: shallow.size > 0,
    mappable: head !== null,
    prData: remote && resolveToken() ? "github" : "none",
    recentCommits: RECENT_COMMITS,
    files: pickShownFiles({ entries, churn, cases }),
  };
}
