import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Artifact, BlameSpan, CodeLocation, Person, RepoRef } from "../types";
import { parseBlamePorcelain } from "./blame-porcelain";
import { rankShallow } from "./rank";
import { isCommitSha } from "./sha";

const exec = promisify(execFile);

const RS = "\x1e";
const FS = "\x1f";

async function git(repoPath: string, args: string[], signal?: AbortSignal): Promise<string> {
  const { stdout } = await exec("git", ["-C", repoPath, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    ...(signal ? { signal } : {}),
  });
  return stdout.toString();
}

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    return (await git(repoPath, ["rev-parse", "--is-inside-work-tree"])).trim() === "true";
  } catch {
    return false;
  }
}

export function remoteToWebUrl(remote: string): { base: string; slug: string } | null {
  const strip = (s: string) => s.replace(/\.git$/, "");

  let m = remote.match(/^[^@]+@([^:]+):(.+)$/);
  if (m) return { base: `https://${m[1]}/${strip(m[2])}`, slug: strip(m[2]) };

  m = remote.match(/^(?:ssh|https?):\/\/(?:[^@/]+@)?([^/]+)\/(.+)$/);
  if (m) return { base: `https://${m[1]}/${strip(m[2])}`, slug: strip(m[2]) };
  return null;
}

export async function resolveRepo(repoPath: string): Promise<RepoRef> {
  const ref: RepoRef = { path: repoPath };
  try {
    ref.branch = (await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  } catch {
    //
  }
  try {
    const web = remoteToWebUrl((await git(repoPath, ["remote", "get-url", "origin"])).trim());
    if (web) {
      ref.remoteUrl = web.base;
      ref.name = web.slug;
    }
  } catch {
    //
  }
  return ref;
}

export type GitCommit = {
  sha: string;
  shortSha: string;
  author: Person;
  date: string;
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

export async function headSha(repoPath: string): Promise<string | null> {
  try {
    const sha = (await git(repoPath, ["rev-parse", "HEAD"])).trim();
    return isCommitSha(sha) ? sha : null;
  } catch {
    return null;
  }
}

export async function lineHistory(
  repoPath: string,
  loc: CodeLocation,
  rev?: string,
): Promise<GitCommit[]> {
  if (rev !== undefined && !isCommitSha(rev)) throw new Error(`Not a commit sha: ${rev}`);
  const out = await git(repoPath, [
    "log",
    `-L${loc.startLine},${loc.endLine}:${loc.file}`,
    "-s",
    "--reverse",
    `--format=${COMMIT_FORMAT}`,
    ...(rev ? [rev] : []),
  ]);
  return out
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
    .map(parseRecord);
}

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

export async function defaultFiles(repoPath: string, limit = 5): Promise<string[]> {
  try {
    const files = (await git(repoPath, ["ls-files"])).split("\n").filter(Boolean);
    return rankShallow(files, limit);
  } catch {
    return [];
  }
}

export async function searchFiles(repoPath: string, query: string, limit = 25): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = new Set<string>();

  try {
    const files = (await git(repoPath, ["ls-files"])).split("\n").filter(Boolean);
    const ql = q.toLowerCase();
    for (const f of files) if (f.toLowerCase().includes(ql)) results.add(f);
  } catch {
    //
  }

  try {
    const grep = await git(repoPath, ["grep", "-l", "-I", "-i", "-F", "-e", q]);
    for (const f of grep.split("\n").filter(Boolean)) results.add(f);
  } catch {
    //
  }

  return [...results].slice(0, limit);
}

export async function readFileAtHead(repoPath: string, filePath: string): Promise<string> {
  return git(repoPath, ["show", `HEAD:${filePath}`]);
}

export async function readFileAtRef(
  repoPath: string,
  ref: string,
  filePath: string,
): Promise<string> {
  if (!isCommitSha(ref)) throw new Error(`Not a commit sha: ${ref}`);
  return git(repoPath, ["show", `${ref}:${filePath}`]);
}

export async function commitAt(
  repoPath: string,
  sha: string,
  filePath: string,
  signal?: AbortSignal,
): Promise<{ date: string; title: string; message: string; parent: string | null; patch: string }> {
  if (!isCommitSha(sha)) throw new Error(`Not a commit sha: ${sha}`);
  const [parents, date, title, ...body] = (
    await git(repoPath, ["log", "-1", "--format=%P%n%aI%n%s%n%b", sha], signal)
  ).split("\n");
  return {
    date: date ?? "",
    title: title ?? "",
    message: [title ?? "", ...body].join("\n").trim(),
    parent: parents?.split(" ")[0] || null,
    patch: await filePatch(repoPath, sha, filePath, signal),
  };
}

export async function ownerAt(
  repoPath: string,
  sha: string,
  filePath: string,
  line: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!isCommitSha(sha)) throw new Error(`Not a commit sha: ${sha}`);
  const out = await git(
    repoPath,
    ["blame", "-L", `${line},${line}`, "--porcelain", sha, "--", filePath],
    signal,
  );
  const owner = out.split(/\s/)[0] ?? "";
  return isCommitSha(owner) ? owner : null;
}

export async function commitScope(
  repoPath: string,
  sha: string,
): Promise<{ files: number; lines: number } | null> {
  if (!isCommitSha(sha)) throw new Error(`Not a commit sha: ${sha}`);
  const rows = (await git(repoPath, ["show", "--format=", "--numstat", sha]))
    .split("\n")
    .map((row) => row.split("\t"))
    .filter((cells) => cells.length >= 3);
  if (rows.length === 0 || rows.some(([added, removed]) => added === "-" || removed === "-"))
    return null;
  return {
    files: rows.length,
    lines: rows.reduce((sum, [added, removed]) => sum + Number(added) + Number(removed), 0),
  };
}

export async function filePatch(
  repoPath: string,
  sha: string,
  filePath: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!isCommitSha(sha)) throw new Error(`Not a commit sha: ${sha}`);
  return git(repoPath, ["show", "--format=", "--unified=3", sha, "--", filePath], signal);
}

export async function blameWindowLocal(
  repoPath: string,
  ref: string,
  filePath: string,
  start: number,
  end: number,
): Promise<BlameSpan[]> {
  if (!isCommitSha(ref)) throw new Error(`Not a commit sha: ${ref}`);
  const out = await git(repoPath, [
    "blame",
    "--porcelain",
    `-L${start},${end}`,
    ref,
    "--",
    filePath,
  ]);
  return parseBlamePorcelain(out);
}
