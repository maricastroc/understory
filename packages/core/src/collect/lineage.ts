import { existsSync } from "node:fs";
import type { Evidence, Lineage, LineageEntry, LineageStop } from "../types";
import { lineBefore, lineChange } from "./code-context";
import { commitAt, ownerAt } from "./git";
import { parseGitHubRepo } from "./github";
import { graphql, rest } from "./github/client";
import { owningCommit } from "../provenance";

export type LineageLimits = { earlier: number; requests: number; ms: number };

export const LINEAGE_LIMITS: LineageLimits = { earlier: 3, requests: 6, ms: 4_000 };

const MAX_MESSAGE = 1_200;

export type CommitAt = {
  date: string;
  title: string;
  message: string;
  parent: string | null;
  patch: string | null;
  previousPath?: string | null;
};

export type LineageProvider = {
  commit(sha: string, path: string): Promise<CommitAt>;
  owner(ref: string, path: string, line: number): Promise<string | null>;
};

export type LineageStart = { sha: string; path: string; text: string };

export async function walkLineage(
  start: LineageStart,
  provider: LineageProvider,
  limits: LineageLimits = LINEAGE_LIMITS,
  signal?: AbortSignal,
  now: () => number = Date.now,
): Promise<Lineage> {
  const began = now();
  const entries: LineageEntry[] = [];
  let requests = 0;
  let { sha, path, text } = start;
  const blocked = (needed: number): LineageStop | null =>
    signal?.aborted
      ? "cancelled"
      : now() - began >= limits.ms
        ? "time limit"
        : requests + needed > limits.requests
          ? "request limit"
          : null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cut = new Promise<LineageStop>((resolve) => {
    timer = setTimeout(() => resolve("time limit"), Math.max(0, limits.ms - (now() - began)));
    signal?.addEventListener("abort", () => resolve("cancelled"), { once: true });
  });
  const within = <T>(work: Promise<T>): Promise<{ got: T } | { stop: LineageStop } | null> =>
    Promise.race([
      work.then(
        (got) => ({ got }),
        () => null,
      ),
      cut.then((stop) => ({ stop })),
    ]);
  const done = (stopped: LineageStop): Lineage => {
    clearTimeout(timer);
    return { entries, stopped };
  };

  for (;;) {
    const before = blocked(1);
    if (before) return done(before);
    requests++;
    const read = await within(provider.commit(sha, path));
    if (!read) return done("no patch");
    if ("stop" in read) return done(read.stop);
    const commit = read.got;
    const entry: LineageEntry = {
      sha,
      date: commit.date,
      title: commit.title,
      ...(commit.message ? { message: commit.message.slice(0, MAX_MESSAGE) } : {}),
    };
    entries.push(entry);
    if (!commit.patch) return done("no patch");
    const change = lineChange(commit.patch, text);
    if (!change) return done("line not located");
    if (change.before === null) {
      entry.did = "added";
      entry.before = null;
      return done("the line was added");
    }
    entry.did = change.before.trim() === text.trim() ? "respaced" : "rewrote";
    entry.before = change.before;
    const earlier = lineBefore(commit.patch, change.before);
    if (earlier === null || !commit.parent) return done("line not located");
    if (entries.length > limits.earlier) return done("depth limit");
    const next = blocked(2);
    if (next) return done(next);
    requests++;
    const owned = await within(provider.owner(commit.parent, commit.previousPath ?? path, earlier));
    if (owned && "stop" in owned) return done(owned.stop);
    if (!owned?.got) return done("line not located");
    sha = owned.got;
    path = commit.previousPath ?? path;
    text = change.before;
  }
}

const OWNER_QUERY =
  "query($o:String!,$r:String!,$e:String!,$p:String!){repository(owner:$o,name:$r){object(expression:$e){... on Commit{blame(path:$p){ranges{startingLine endingLine commit{oid}}}}}}}";

type OwnerAnswer = {
  repository?: {
    object?: {
      blame?: {
        ranges: Array<{ startingLine: number; endingLine: number; commit: { oid: string } }>;
      };
    };
  };
};

type CommitAnswer = {
  parents?: Array<{ sha: string }>;
  commit?: { message?: string; committer?: { date?: string }; author?: { date?: string } };
  files?: Array<{ filename: string; patch?: string; previous_filename?: string }>;
};

export function githubLineage(owner: string, repo: string): LineageProvider {
  return {
    async commit(sha, path) {
      const d = await rest<CommitAnswer>(
        `/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`,
      );
      const file = d.files?.find((f) => f.filename === path);
      const message = d.commit?.message ?? "";
      return {
        date: d.commit?.committer?.date ?? d.commit?.author?.date ?? "",
        title: message.split("\n")[0] ?? "",
        message,
        parent: d.parents?.[0]?.sha ?? null,
        patch: file?.patch ?? null,
        previousPath: file?.previous_filename ?? null,
      };
    },
    async owner(ref, path, line) {
      const d = await graphql<OwnerAnswer>(OWNER_QUERY, { o: owner, r: repo, e: ref, p: path });
      const range = d.repository?.object?.blame?.ranges.find(
        (r) => r.startingLine <= line && line <= r.endingLine,
      );
      return range?.commit.oid ?? null;
    },
  };
}

export function localLineage(repoPath: string): LineageProvider {
  return {
    commit: (sha, path) => commitAt(repoPath, sha, path),
    owner: (ref, path, line) => ownerAt(repoPath, ref, path, line),
  };
}

export async function lineageOf(
  ev: Evidence,
  options: { limits?: LineageLimits; signal?: AbortSignal } = {},
): Promise<Lineage | null> {
  const { location } = ev;
  const sha = owningCommit(ev)?.meta?.sha;
  if (!location || location.startLine !== location.endLine || typeof sha !== "string") return null;
  if (ev.coverage?.granularity === "file" || !ev.code) return null;
  const text = ev.code.lines[location.startLine - ev.code.startLine];
  if (text === undefined) return null;
  const gh = parseGitHubRepo(ev.repo.remoteUrl ?? ev.repo.path);
  const local = !/^https?:\/\//.test(ev.repo.path) && existsSync(ev.repo.path);
  const provider = local
    ? localLineage(ev.repo.path)
    : gh
      ? githubLineage(gh.owner, gh.repo)
      : null;
  if (!provider) return null;
  const limits =
    options.limits ??
    (local ? { ...LINEAGE_LIMITS, requests: Number.POSITIVE_INFINITY } : LINEAGE_LIMITS);
  return walkLineage({ sha, path: location.file, text }, provider, limits, options.signal);
}
