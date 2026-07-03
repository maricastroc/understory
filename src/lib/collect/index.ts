/**
 * [2]+[3] Collection seam.
 *
 * `collect()` turns a question about a place in the code into Evidence.
 * A GitHub repo (URL / owner-repo) is read via the GitHub API — no clone;
 * a local path is read with git on disk. Both produce the same Evidence shape,
 * so synthesize/verify/UI don't care which source it came from.
 */

import type { Artifact, CodeLocation, Evidence, RepoRef } from "../types";
import { commitToArtifact, isGitRepo, lineHistory, resolveRepo } from "./git";
import {
  type AssociatedPr,
  type BlameCommit,
  type PrIssue,
  type PrReview,
  blameLines,
  getRepoMeta,
  parseGitHubRepo,
} from "./github";

export type CollectInput = {
  /** GitHub URL / owner-repo, or a local path to a clone. */
  repoPath: string;
  question: string;
  location: CodeLocation;
};

/** Gather all evidence for one question. */
export async function collect(input: CollectInput): Promise<Evidence> {
  const { repoPath, question, location } = input;

  const gh = parseGitHubRepo(repoPath);
  if (gh) return collectFromGitHub(gh.owner, gh.repo, question, location);

  if (!(await isGitRepo(repoPath))) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }
  const repo = await resolveRepo(repoPath);
  const commits = await lineHistory(repoPath, location);
  const artifacts = commits.map((c) => commitToArtifact(c, repo));
  return { question, repo, location, artifacts };
}

/** [2] GitHub API path: blame the line, turn its commit(s) into Artifacts.
 *  (PR/issue/review enrichment plugs in here next.) */
async function collectFromGitHub(
  owner: string,
  repo: string,
  question: string,
  location: CodeLocation,
): Promise<Evidence> {
  const meta = await getRepoMeta(owner, repo);
  const repoRef: RepoRef = {
    path: `${owner}/${repo}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };
  const commits = await blameLines(
    owner,
    repo,
    meta.branch,
    location.file,
    location.startLine,
    location.endLine,
  );

  const artifacts: Artifact[] = [];
  const seen = new Set<string>();
  const add = (a: Artifact) => {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      artifacts.push(a);
    }
  };

  for (const c of commits) {
    add(commitArtifact(c));
    for (const pr of c.associatedPullRequests.nodes) {
      add(prArtifact(pr));
      for (const iss of pr.closingIssuesReferences.nodes) add(issueArtifact(iss));
      pr.reviews.nodes.forEach((rv, i) => {
        if (rv.body.trim()) add(reviewArtifact(pr, rv, i));
      });
    }
  }

  artifacts.sort((a, b) => a.date.localeCompare(b.date));
  return { question, repo: repoRef, location, artifacts };
}

function commitArtifact(c: BlameCommit): Artifact {
  return {
    id: `commit:${c.abbreviatedOid}`,
    kind: "commit",
    title: c.messageHeadline,
    body: c.message?.trim() || c.messageHeadline,
    url: c.url,
    date: c.committedDate,
    author: c.author?.name
      ? { name: c.author.name, email: c.author.email ?? undefined }
      : undefined,
    ref: c.abbreviatedOid,
    meta: { sha: c.oid },
  };
}

function prArtifact(pr: AssociatedPr): Artifact {
  return {
    id: `pr:${pr.number}`,
    kind: "pull_request",
    title: pr.title,
    body: pr.body?.trim() ? `${pr.title}\n\n${pr.body.trim()}` : pr.title,
    url: pr.url,
    date: pr.createdAt,
    ref: `#${pr.number}`,
  };
}

function issueArtifact(iss: PrIssue): Artifact {
  return {
    id: `issue:${iss.number}`,
    kind: "issue",
    title: iss.title,
    body: iss.body?.trim() ? `${iss.title}\n\n${iss.body.trim()}` : iss.title,
    url: iss.url,
    date: iss.createdAt,
    ref: `#${iss.number}`,
  };
}

function reviewArtifact(pr: AssociatedPr, rv: PrReview, i: number): Artifact {
  const who = rv.author?.login ?? "reviewer";
  return {
    id: `review:${pr.number}-${i}`,
    kind: "review",
    title: `Review by ${who} on #${pr.number}`,
    body: rv.body.trim(),
    url: pr.url,
    date: rv.submittedAt,
    author: { name: who },
    ref: `#${pr.number}`,
  };
}

/** Parse "src/billing/charge.ts:8" or "...:8-12" into a CodeLocation. */
export function parseLocation(raw: string): CodeLocation {
  const at = raw.lastIndexOf(":");
  if (at === -1) {
    throw new Error(`Location must be "file:line" or "file:start-end" (got "${raw}")`);
  }
  const file = raw.slice(0, at);
  const span = raw.slice(at + 1);
  const m = span.match(/^(\d+)(?:[-,](\d+))?$/);
  if (!file || !m) {
    throw new Error(`Bad location "${raw}" — expected e.g. src/app/charge.ts:8 or charge.ts:8-12`);
  }
  const startLine = Number(m[1]);
  const endLine = m[2] ? Number(m[2]) : startLine;
  return { file, startLine, endLine };
}
