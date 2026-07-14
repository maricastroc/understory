// 1-based, inclusive line range.
export type LineRange = { start: number; end: number };

export type FileChangeStatus = "added" | "deleted" | "modified" | "renamed";

export type FileChange = {
  oldPath: string | null;
  newPath: string | null;
  status: FileChangeStatus;
  removedRanges: LineRange[];
  addedRanges: LineRange[];
  binary: boolean;
};

export type ParsedDiff = { files: FileChange[] };

export type BlameTarget = { path: string; range: LineRange };

export type BlamedTarget = { target: BlameTarget; commitId: string };

export type ChangeCluster = { commitId: string; targets: BlameTarget[] };

export type DiffCluster = {
  commitId: string;
  targets: BlameTarget[];
  artifacts: import("../types").Artifact[];
  contradictions: import("../types").Contradiction[];
  rank: number;
};

export type PullRef = {
  number: number;
  title: string;
  url: string;
  baseSha: string;
  headSha: string;
};

export type DiffTriage = {
  filesChanged: number;
  filesConsidered: number;
  filesSkipped: number;
  targetsBlamed: number;
  clustersFound: number;
  clustersDetailed: number;
  truncated: boolean;
};

export type DiffCollection = {
  repo: import("../types").RepoRef;
  pr: PullRef;
  clusters: DiffCluster[];
  triage: DiffTriage;
  note?: string;
};

export type RawDiffFinding = {
  cluster: string;
  why: string;
  citations: string[];
  recorded: boolean;
};

export type DiffNarrative = { summary: string; findings: RawDiffFinding[] };

export type VerifiedDiffFinding = {
  ref: string;
  targets: BlameTarget[];
  why: string;
  citations: string[];
  unknownCitations: string[];
  grounded: boolean;
  recorded: boolean;
  confidence: import("../types").Confidence;
  artifacts: import("../types").Artifact[];
  contradictions: import("../types").Contradiction[];
  entailment?: import("../types").Entailment;
};

export type DiffResult = {
  repo: import("../types").RepoRef;
  pr: PullRef;
  triage: DiffTriage;
  summary: string;
  findings: VerifiedDiffFinding[];
  note?: string;
  error?: string;
};
