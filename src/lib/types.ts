export type Person = {
  name: string;
  email?: string;
};

export type ArtifactKind = "commit" | "pull_request" | "issue" | "review";

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  body: string;
  url: string;
  date: string;
  author?: Person;
  ref?: string;
  meta?: Record<string, string | number>;
};

export type CodeLocation = {
  file: string;
  startLine: number;
  endLine: number;
};

export type RepoRef = {
  path: string;
  name?: string;
  remoteUrl?: string;
  branch?: string;
};
export type Evidence = {
  question: string;
  repo: RepoRef;
  location: CodeLocation;
  artifacts: Artifact[];
};
export type Narrative = {
  answer: string;
  /** Artifact ids the model claims to rely on, e.g. ["commit:c038fb3"]. */
  citations: string[];
  recorded: boolean;
};

export type Confidence = {
  score: number;
  level: "high" | "medium" | "low";
  primarySources: number;
  corroborating: number;
  contradicting: number;
};

export type VerifiedNarrative = Narrative & {
  grounded: boolean;
  unknownCitations: string[];
  confidence: Confidence;
};

export type DigResult = {
  evidence: Evidence;
  narrative: VerifiedNarrative | null;
  error?: string;
};
