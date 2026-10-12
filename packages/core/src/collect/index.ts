import type {
  Artifact,
  ArtifactRef,
  CodeLocation,
  Coverage,
  Evidence,
  LineChange,
  RepoRef,
} from "../types";
import { owningCommit } from "../provenance";
import type { BlameCommit } from "./github";
import { codeWindow, lineChange } from "./code-context";
import { detectContradictions } from "./contradictions";
import {
  commitToArtifact,
  filePatch,
  headSha,
  isGitRepo,
  lineHistory,
  readFileAtRef,
  resolveRepo,
} from "./git";
import { enrichLocalCommits } from "./local-enrich";
import { resolveToken } from "./token-context";
import {
  blameLinesAt,
  commitContextArtifacts,
  commitFilePatch,
  expandCommit,
  fileHistoryGitHub,
  getBranchHeadGitHub,
  getFileContentGitHub,
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
  commitFilePatchGitLab,
  fileHistoryGitLab,
  getBranchHeadGitLab,
  getFileContentGitLab,
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

type PatchOf = (sha: string) => Promise<string | null>;

async function lastChange(
  base: BaseEvidence,
  line: string | undefined,
  patchOf: PatchOf,
): Promise<LineChange | null> {
  const { location } = base;
  const owner = owningCommit(base);
  const sha = owner?.meta?.sha;
  if (!location || location.startLine !== location.endLine) return null;
  if (!owner || typeof sha !== "string" || line === undefined) return null;
  try {
    const found = lineChange((await patchOf(sha)) ?? "", line);
    return found ? { artifactId: owner.id, ...found } : null;
  } catch {
    return null;
  }
}

async function withCode(
  base: BaseEvidence,
  source: () => Promise<string>,
  patchOf: PatchOf,
): Promise<BaseEvidence> {
  const { location } = base;
  if (!location || base.coverage?.granularity === "file") return base;
  try {
    const code = codeWindow(await source(), location);
    if (!code) return base;
    const change = await lastChange(base, code.lines[location.startLine - code.startLine], patchOf);
    return { ...base, code: change ? { ...code, change } : code };
  } catch {
    return base;
  }
}

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

  const base: BaseEvidence = {
    question,
    repo: sha ? { ...repo, sha } : repo,
    location,
    artifacts,
    coverage: { granularity: "line" },
  };
  if (!sha) return base;
  return withCode(
    base,
    () => readFileAtRef(repoPath, sha, location.file),
    (commit) => filePatch(repoPath, commit, location.file),
  );
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
  const base: BaseEvidence = {
    question,
    repo: sha ? { ...repoRef, sha } : repoRef,
    location,
    artifacts,
    note,
    coverage: { granularity },
  };
  return withCode(
    base,
    () => getFileContentGitHub(owner, repo, sha ?? meta.branch, location.file),
    (commit) => commitFilePatch(owner, repo, commit, location.file),
  );
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
  const base: BaseEvidence = {
    question,
    repo: sha ? { ...repoRef, sha } : repoRef,
    location,
    artifacts,
    note,
    coverage: { granularity },
  };
  return withCode(
    base,
    () => getFileContentGitLab(host, project, ref, location.file),
    (commit) => commitFilePatchGitLab(host, project, commit, location.file),
  );
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
