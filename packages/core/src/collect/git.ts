import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Artifact, CodeLocation, Person, RepoRef } from "../types";
import { rankShallow } from "./rank";

const exec = promisify(execFile);

const RS = "\x1e";
const FS = "\x1f";

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", repoPath, ...args], {
    maxBuffer: 64 * 1024 * 1024,
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

export async function lineHistory(repoPath: string, loc: CodeLocation): Promise<GitCommit[]> {
  const out = await git(repoPath, [
    "log",
    `-L${loc.startLine},${loc.endLine}:${loc.file}`,
    "-s",
    "--reverse",
    `--format=${COMMIT_FORMAT}`,
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

export async function introducingCommits(repoPath: string, loc: CodeLocation): Promise<Artifact[]> {
  const repo = await resolveRepo(repoPath);
  const commits = await lineHistory(repoPath, loc);
  return commits.map((c) => commitToArtifact(c, repo));
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
