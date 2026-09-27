import type { Artifact, ArtifactRef, CodeLocation, Coverage, Evidence, RepoRef } from "../types";
import type { BlameCommit } from "./github";
import { detectContradictions } from "./contradictions";
import { commitToArtifact, headSha, isGitRepo, lineHistory, resolveRepo } from "./git";
import { enrichLocalCommits } from "./local-enrich";
import { resolveToken } from "./token-context";
import {
  blameLinesAt,
  commitContextArtifacts,
  expandCommit,
  fileHistoryGitHub,
  getBranchHeadGitHub,
  getFileSizeGitHub,
  getRepoMeta,
  issueContextArtifacts,
  parseGitHubRepo,
  prContextArtifacts,
} from "./github";
import {
  type GitLabCommit,
  type MergeRequestBundle,
  blameLinesGitLab,
  commitContextArtifactsGitLab,
  fileHistoryGitLab,
  getBranchHeadGitLab,
  getFileSizeGitLab,
  getProjectMeta,
  glCommitArtifact,
  glIssueArtifact,
  glMrArtifact,
  glReviewArtifact,
  issueContextArtifactsGitLab,
  mergeRequestBundle,
  mrContextArtifacts,
  parseGitLabRepo,
} from "./gitlab";

export { parseLocation } from "./parse-location";

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
  const gl = gh ? null : parseGitLabRepo(repoPath);

  let base: BaseEvidence;
  if (anchor) {
    if (gh) base = await collectAroundArtifact(gh.owner, gh.repo, question, anchor);
    else if (gl) base = await collectAroundGitLabArtifact(gl.host, gl.project, question, anchor);
    else throw new Error("Drill-down is only available for GitHub and GitLab repositories.");
  } else if (location) {
    if (gh) base = await collectFromGitHub(gh.owner, gh.repo, question, location);
    else if (gl) base = await collectFromGitLab(gl.host, gl.project, question, location);
    else base = await collectLocal(repoPath, question, location);
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
  const sha = await headSha(repoPath);
  const commits = await lineHistory(repoPath, location, sha ?? undefined);

  const gh = parseGitHubRepo(repo.remoteUrl ?? "");
  const artifacts =
    gh && resolveToken()
      ? await enrichLocalCommits(gh.owner, gh.repo, commits, repo)
      : commits.map((c) => {
          const a = commitToArtifact(c, repo);
          return { ...a, meta: { ...a.meta, prLookup: "skipped" } };
        });

  return {
    question,
    repo: sha ? { ...repo, sha } : repo,
    location,
    artifacts,
    coverage: { granularity: "line" },
  };
}

const LARGE_FILE_BYTES = 1_000_000;
const MAX_MR_ENRICH = 10;

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
  let granularity: Coverage["granularity"] = "line";
  let sha: string | undefined;

  const fileHistory = async () => {
    sha = await getBranchHeadGitHub(owner, repo, meta.branch).catch(() => undefined);
    return fileHistoryGitHub(owner, repo, sha ?? meta.branch, location.file);
  };

  const size = await getFileSizeGitHub(owner, repo, meta.branch, location.file).catch(() => 0);
  if (size > LARGE_FILE_BYTES) {
    commits = await fileHistory();
    granularity = "file";
    note =
      "This file is too large for GitHub's blame API, so line-level history isn't available here — showing recent commits that touched the file instead. A local checkout gives full line-level history.";
  } else {
    try {
      const blamed = await blameLinesAt(
        owner,
        repo,
        meta.branch,
        location.file,
        location.startLine,
        location.endLine,
      );
      commits = blamed.commits;
      sha = blamed.oid ?? undefined;
    } catch {
      commits = await fileHistory();
      granularity = "file";
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
    for (const a of expandCommit(c)) add(a);
  }

  artifacts.sort((a, b) => a.date.localeCompare(b.date));
  return {
    question,
    repo: sha ? { ...repoRef, sha } : repoRef,
    location,
    artifacts,
    note,
    coverage: { granularity },
  };
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

async function collectFromGitLab(
  host: string,
  project: string,
  question: string,
  location: CodeLocation,
): Promise<BaseEvidence> {
  const meta = await getProjectMeta(host, project);
  const repoRef: RepoRef = {
    path: `${host}/${project}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };

  let commits: GitLabCommit[];
  let note: string | undefined;
  let granularity: Coverage["granularity"] = "line";

  const sha = await getBranchHeadGitLab(host, project, meta.branch).catch(() => undefined);
  const ref = sha ?? meta.branch;

  const size = await getFileSizeGitLab(host, project, ref, location.file).catch(() => 0);
  if (size > LARGE_FILE_BYTES) {
    commits = await fileHistoryGitLab(host, project, ref, location.file);
    granularity = "file";
    note =
      "This file is too large for GitLab's blame API, so line-level history isn't available here — showing recent commits that touched the file instead. A local checkout gives full line-level history.";
  } else {
    try {
      commits = await blameLinesGitLab(
        host,
        project,
        ref,
        location.file,
        location.startLine,
        location.endLine,
      );
    } catch {
      commits = await fileHistoryGitLab(host, project, ref, location.file);
      granularity = "file";
      note =
        "GitLab's blame API couldn't resolve line-level history for this file — showing recent commits that touched it instead.";
    }
  }

  const iids = [...new Set(commits.flatMap((c) => c.mergeRequests.map((m) => m.iid)))].slice(
    0,
    MAX_MR_ENRICH,
  );
  const bundles = new Map<number, MergeRequestBundle>();
  await Promise.all(
    iids.map(async (iid) => {
      bundles.set(
        iid,
        await mergeRequestBundle(host, project, iid).catch(() => ({
          mr: null,
          reviews: [],
          issues: [],
        })),
      );
    }),
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
    const commit = glCommitArtifact(c);
    if (c.prLookup) commit.meta = { ...commit.meta, prLookup: c.prLookup };
    add(commit);
    for (const mr of c.mergeRequests) {
      const prCard = glMrArtifact(mr, commit.id);
      add(prCard);
      const bundle = bundles.get(mr.iid);
      if (!bundle) continue;
      for (const iss of bundle.issues) add(glIssueArtifact(iss, prCard.id));
      bundle.reviews.forEach((n, i) => {
        if (n.body.trim()) add(glReviewArtifact(mr.iid, mr.web_url, n, i, prCard.id));
      });
    }
  }

  artifacts.sort((a, b) => a.date.localeCompare(b.date));
  return {
    question,
    repo: sha ? { ...repoRef, sha } : repoRef,
    location,
    artifacts,
    note,
    coverage: { granularity },
  };
}

async function collectAroundGitLabArtifact(
  host: string,
  project: string,
  question: string,
  anchor: ArtifactRef,
): Promise<BaseEvidence> {
  const meta = await getProjectMeta(host, project);
  const repoRef: RepoRef = {
    path: `${host}/${project}`,
    name: meta.name,
    remoteUrl: meta.htmlUrl,
    branch: meta.branch,
  };

  const raw = await gitlabArtifactsForAnchor(host, project, anchor);

  const seen = new Set<string>();
  const artifacts = raw.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  artifacts.sort((a, b) => a.date.localeCompare(b.date));

  return { question, repo: repoRef, anchor, artifacts };
}

function gitlabArtifactsForAnchor(
  host: string,
  project: string,
  anchor: ArtifactRef,
): Promise<Artifact[]> {
  switch (anchor.kind) {
    case "pull_request":
    case "review":
      if (anchor.number == null) throw new Error("Missing merge request number for drill-down.");
      return mrContextArtifacts(host, project, anchor.number);
    case "issue":
      if (anchor.number == null) throw new Error("Missing issue number for drill-down.");
      return issueContextArtifactsGitLab(host, project, anchor.number);
    case "commit": {
      const oid = anchor.oid ?? anchor.ref;
      if (!oid) throw new Error("Missing commit sha for drill-down.");
      return commitContextArtifactsGitLab(host, project, oid);
    }
  }
}
