export type LineRange = { start: number; end: number };

export type FileChangeStatus = "added" | "deleted" | "modified" | "renamed";

export type HunkLine = {
  kind: "del" | "add";
  old: number | null;
  new: number | null;
  text: string;
};

export type ChangeLine = HunkLine & { block: number };

export type TargetHunk = { lines: HunkLine[]; removed: number; added: number; omitted: number };

export type FileChange = {
  oldPath: string | null;
  newPath: string | null;
  status: FileChangeStatus;
  removedRanges: LineRange[];
  addedRanges: LineRange[];
  binary: boolean;
  changes?: ChangeLine[];
};

export type ParsedDiff = { files: FileChange[] };

export type BlameTarget = { path: string; range: LineRange; hunk?: TargetHunk };

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
  createdAt?: string;
  mergedAt?: string | null;
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
  connection?: string;
  citations: string[];
  recorded: boolean;
};

export type DiffNarrative = {
  summaryClaims: import("../types").Claim[];
  findings: RawDiffFinding[];
};

export type VerifiedDiffFinding = {
  ref: string;
  targets: BlameTarget[];
  why: string;
  connection: string;
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
  summaryClaims: import("../types").VerifiedClaim[];
  summaryEntailment?: import("../types").Entailment;
  findings: VerifiedDiffFinding[];
  note?: string;
  error?: string;
};
