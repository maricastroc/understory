/**
 * [2] Local git collection — no network, no API, no LLM.
 *
 * The core move is `git log -L<start>,<end>:<file>`, which traces a specific
 * line range through history and returns exactly the commits that changed it —
 * the *biography* of a line. That is the archaeology.
 *
 * We use execFile (never a shell) so repo paths and refs can't be injected,
 * and NUL-ish separators (0x1e record, 0x1f field) so commit bodies with
 * newlines, quotes and colons parse unambiguously.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Artifact, CodeLocation, Person, RepoRef } from "../types";

const exec = promisify(execFile);

const RS = "\x1e"; // record separator — one per commit
const FS = "\x1f"; // field separator — between fields of a commit

/** Run a git command inside `repoPath`. Args are passed as an array (no shell). */
async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", repoPath, ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.toString();
}

/** True if `repoPath` is inside a git work tree. */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    return (await git(repoPath, ["rev-parse", "--is-inside-work-tree"])).trim() === "true";
  } catch {
    return false;
  }
}

/** Turn a git remote URL into a browsable web base + "owner/name" slug. */
export function remoteToWebUrl(remote: string): { base: string; slug: string } | null {
  const strip = (s: string) => s.replace(/\.git$/, "");
  // git@github.com:acme/payments-service.git
  let m = remote.match(/^[^@]+@([^:]+):(.+)$/);
  if (m) return { base: `https://${m[1]}/${strip(m[2])}`, slug: strip(m[2]) };
  // ssh://git@github.com/acme/payments-service.git  |  https://github.com/acme/x.git
  m = remote.match(/^(?:ssh|https?):\/\/(?:[^@/]+@)?([^/]+)\/(.+)$/);
  if (m) return { base: `https://${m[1]}/${strip(m[2])}`, slug: strip(m[2]) };
  return null;
}

/** Best-effort metadata about the repo: branch, remote name, web base. */
export async function resolveRepo(repoPath: string): Promise<RepoRef> {
  const ref: RepoRef = { path: repoPath };
  try {
    ref.branch = (await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  } catch {
    /* detached / empty repo — leave branch undefined */
  }
  try {
    const web = remoteToWebUrl((await git(repoPath, ["remote", "get-url", "origin"])).trim());
    if (web) {
      ref.remoteUrl = web.base;
      ref.name = web.slug;
    }
  } catch {
    /* no remote — local-only investigation */
  }
  return ref;
}

/** A commit as read from git, before it becomes an Artifact. */
export type GitCommit = {
  sha: string;
  shortSha: string;
  author: Person;
  date: string; // ISO 8601
  subject: string;
  body: string;
};

const COMMIT_FORMAT = RS + ["%H", "%h", "%an", "%ae", "%aI", "%s", "%b"].join(FS);

function parseRecord(record: string): GitCommit {
  const [sha, shortSha, name, email, date, subject, ...bodyParts] = record.split(FS);
  return {
    sha,
    shortSha,
    author: { name, email: email || undefined },
    date,
    subject,
    body: bodyParts.join(FS).trim(),
  };
}

/**
 * The commits that changed lines [start,end] of `file`, **oldest first** —
 * the biography of that line. `file` must be repo-relative and exist at HEAD.
 * Returns [] when nothing in history touched the range.
 */
export async function lineHistory(repoPath: string, loc: CodeLocation): Promise<GitCommit[]> {
  const out = await git(repoPath, [
    "log",
    `-L${loc.startLine},${loc.endLine}:${loc.file}`,
    "-s", // suppress the diff; we only want the commit headers
    "--reverse", // chronological — the timeline reads top-to-bottom
    `--format=${COMMIT_FORMAT}`,
  ]);
  return out
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
    .map(parseRecord);
}

/** Map a raw commit to a citable Artifact ("Exhibit"). */
export function commitToArtifact(c: GitCommit, repo: RepoRef): Artifact {
  return {
    id: `commit:${c.shortSha}`,
    kind: "commit",
    title: c.subject,
    body: c.body ? `${c.subject}\n\n${c.body}` : c.subject,
    url: repo.remoteUrl ? `${repo.remoteUrl}/commit/${c.sha}` : "",
    date: c.date,
    author: c.author,
    ref: c.shortSha,
    meta: { sha: c.sha },
  };
}

/**
 * Plan's [2] entry point: the introducing/changing commits for a line, as
 * Artifacts, oldest first. Resolves repo metadata internally.
 */
export async function introducingCommits(
  repoPath: string,
  loc: CodeLocation,
): Promise<Artifact[]> {
  const repo = await resolveRepo(repoPath);
  const commits = await lineHistory(repoPath, loc);
  return commits.map((c) => commitToArtifact(c, repo));
}

/**
 * Find files in the repo by path fragment OR by content (a symbol name).
 * Powers the "search files or symbols" step of the investigation flow.
 */
export async function searchFiles(repoPath: string, query: string, limit = 25): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = new Set<string>();

  // filename matches — path contains the query
  try {
    const files = (await git(repoPath, ["ls-files"])).split("\n").filter(Boolean);
    const ql = q.toLowerCase();
    for (const f of files) if (f.toLowerCase().includes(ql)) results.add(f);
  } catch {
    /* empty repo */
  }

  // content matches — files containing the query (fixed string, case-insensitive)
  try {
    const grep = await git(repoPath, ["grep", "-l", "-I", "-i", "-F", "-e", q]);
    for (const f of grep.split("\n").filter(Boolean)) results.add(f);
  } catch {
    /* git grep exits non-zero when nothing matches — not an error for us */
  }

  return [...results].slice(0, limit);
}

/** Read a file's contents at HEAD — the same revision line-history investigates. */
export async function readFileAtHead(repoPath: string, filePath: string): Promise<string> {
  return git(repoPath, ["show", `HEAD:${filePath}`]);
}
