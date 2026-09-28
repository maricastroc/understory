import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { HeadCommit, TreeEntry } from "../../types";
import { parseBlamePorcelain } from "../blame-porcelain";
import { RECENT_COMMITS } from "../rank";
import { isCommitSha } from "../sha";
import type { SpanLike } from "./summarize";

const exec = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", repoPath, ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.toString();
}

export async function treeEntriesLocal(repoPath: string): Promise<TreeEntry[]> {
  const out = await git(repoPath, ["ls-tree", "-r", "-l", "--full-tree", "HEAD"]);
  const entries: TreeEntry[] = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\d+ blob ([0-9a-f]{40})\s+(\d+|-)\t(.+)$/);
    if (m) entries.push({ path: m[3], sha: m[1], size: m[2] === "-" ? null : Number(m[2]) });
  }
  return entries;
}

export async function headCommitLocal(repoPath: string): Promise<HeadCommit | null> {
  try {
    const [sha, date] = (await git(repoPath, ["log", "-1", "--format=%H%x1f%cI"]))
      .trim()
      .split("\x1f");
    return sha && date ? { sha, date: new Date(date).toISOString() } : null;
  } catch {
    return null;
  }
}

export async function shallowCommitsLocal(repoPath: string): Promise<Set<string>> {
  try {
    if ((await git(repoPath, ["rev-parse", "--is-shallow-repository"])).trim() !== "true") {
      return new Set();
    }
    const file = (await git(repoPath, ["rev-parse", "--git-path", "shallow"])).trim();
    const text = await readFile(isAbsolute(file) ? file : join(repoPath, file), "utf8");
    return new Set(text.split("\n").filter((l) => /^[0-9a-f]{40}$/.test(l)));
  } catch {
    return new Set();
  }
}

export async function recentChurnLocal(repoPath: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const out = await git(repoPath, [
      "log",
      "--no-merges",
      `-${RECENT_COMMITS}`,
      "--name-only",
      "--format=%x1e",
    ]);
    for (const block of out.split("\x1e")) {
      for (const f of new Set(block.split("\n").filter(Boolean))) {
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
  } catch {
    //
  }
  return counts;
}

export async function blameFileLocal(
  repoPath: string,
  ref: string,
  path: string,
): Promise<SpanLike[]> {
  if (!isCommitSha(ref)) throw new Error(`Not a commit sha: ${ref}`);
  const out = await git(repoPath, ["blame", "--porcelain", "--root", ref, "--", path]);
  return parseBlamePorcelain(out);
}
