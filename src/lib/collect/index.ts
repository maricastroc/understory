import type { Artifact, ArtifactRef, CodeLocation, Evidence, RepoRef } from "../types";
import type { BlameCommit } from "./github";
import { detectContradictions } from "./contradictions";
import { commitToArtifact, isGitRepo, lineHistory, resolveRepo } from "./git";
import {
  blameLines,
  commitArtifact,
  commitContextArtifacts,
  fileHistoryGitHub,
  getFileSizeGitHub,
  getRepoMeta,
  issueArtifact,
  issueContextArtifacts,
  parseGitHubRepo,
  prArtifact,
  prContextArtifacts,
  reviewArtifact,
} from "./github";

export type CollectInput = {
  repoPath: string;
  question: string;
  location?: CodeLocation;
  anchor?: ArtifactRef;
};

type BaseEvidence = Omit<Evidence, "contradictions">;

export async function collect(input: CollectInput): Promise<Evidence> {
  const { repoPath, question, location, anchor } = input;
  const gh = parseGitHubRepo(repoPath);

  let base: BaseEvidence;
  if (anchor) {
    if (!gh) throw new Error("Drill-down is only available for GitHub repositories.");
    base = await collectAroundArtifact(gh.owner, gh.repo, question, anchor);
  } else if (location) {
    base = gh
      ? await collectFromGitHub(gh.owner, gh.repo, question, location)
      : await collectLocal(repoPath, question, location);
  } else {
    throw new Error("collect requires a code location or an artifact to anchor on.");
  }

  return { ...base, contradictions: detectContradictions(base.artifacts) };
}

async function collectLocal(
  repoPath: string,
  question: string,
  location: CodeLocation,
): Promise<BaseEvidence> {
  if (!(await isGitRepo(repoPath))) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }
  const repo = await resolveRepo(repoPath);
  const commits = await lineHistory(repoPath, location);
  const artifacts = commits.map((c) => commitToArtifact(c, repo));
  return { question, repo, location, artifacts };
}

const LARGE_FILE_BYTES = 1_000_000;

async function collectFromGitHub(
  owner: string,
  repo: string,
  question: string,
  location: CodeLocation,
): Promise<BaseEvidence> {
  const meta = await getRepoMeta(owner, repo);
  const repoRef: RepoRef = {
    path: `${owner}/${repo}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };

  let commits: BlameCommit[];
  let note: string | undefined;

  const size = await getFileSizeGitHub(owner, repo, meta.branch, location.file).catch(() => 0);
  if (size > LARGE_FILE_BYTES) {
    commits = await fileHistoryGitHub(owner, repo, meta.branch, location.file);
    note =
      "This file is too large for GitHub's blame API, so line-level history isn't available here — showing recent commits that touched the file instead. A local checkout gives full line-level history.";
  } else {
    try {
      commits = await blameLines(
        owner,
        repo,
        meta.branch,
        location.file,
        location.startLine,
        location.endLine,
      );
    } catch {
      commits = await fileHistoryGitHub(owner, repo, meta.branch, location.file);
      note =
        "GitHub's blame API couldn't resolve line-level history for this file — showing recent commits that touched it instead.";
    }
  }

  const artifacts: Artifact[] = [];
  const seen = new Set<string>();
  const add = (a: Artifact) => {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      artifacts.push(a);
    }
  };

  for (const c of commits) {
    const commit = commitArtifact(c);
    add(commit);
    for (const pr of c.associatedPullRequests.nodes) {
      const prCard = prArtifact(pr, commit.id);
      add(prCard);
      for (const iss of pr.closingIssuesReferences.nodes) add(issueArtifact(iss, prCard.id));
      pr.reviews.nodes.forEach((rv, i) => {
        if (rv.body.trim()) add(reviewArtifact(pr.number, pr.url, rv, i, prCard.id));
      });
    }
  }

  artifacts.sort((a, b) => a.date.localeCompare(b.date));
  return { question, repo: repoRef, location, artifacts, note };
}

async function collectAroundArtifact(
  owner: string,
  repo: string,
  question: string,
  anchor: ArtifactRef,
): Promise<BaseEvidence> {
  const meta = await getRepoMeta(owner, repo);
  const repoRef: RepoRef = {
    path: `${owner}/${repo}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };

  const raw = await artifactsForAnchor(owner, repo, anchor);

  const seen = new Set<string>();
  const artifacts = raw.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  artifacts.sort((a, b) => a.date.localeCompare(b.date));

  return { question, repo: repoRef, anchor, artifacts };
}

function artifactsForAnchor(owner: string, repo: string, anchor: ArtifactRef): Promise<Artifact[]> {
  switch (anchor.kind) {
    case "pull_request":
    case "review":
      if (anchor.number == null) throw new Error("Missing pull request number for drill-down.");
      return prContextArtifacts(owner, repo, anchor.number);
    case "issue":
      if (anchor.number == null) throw new Error("Missing issue number for drill-down.");
      return issueContextArtifacts(owner, repo, anchor.number);
    case "commit": {
      const oid = anchor.oid ?? anchor.ref;
      if (!oid) throw new Error("Missing commit sha for drill-down.");
      return commitContextArtifacts(owner, repo, oid);
    }
  }
}

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
