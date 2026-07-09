export type ArtifactKind = "commit" | "pull_request" | "issue" | "review";

export type Person = {
  name: string;
  email?: string;
};

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  body: string;
  url: string;
  date: string;
  author?: Person;
  ref?: string;
  parentId?: string;
};

export type Contradiction = {
  artifactId: string;
  by?: string;
  kind: "revert" | "reopened" | "declined";
  detail: string;
};

export type CodeLocation = {
  file: string;
  startLine: number;
  endLine: number;
};

export type Confidence = {
  score: number;
  level: "high" | "medium" | "low";
  primarySources: number;
  corroborating: number;
  contradicting: number;
};

export type Evidence = {
  question: string;
  location?: CodeLocation;
  artifacts: Artifact[];
  contradictions: Contradiction[];
  note?: string;
};

export type Narrative = {
  answer: string;
  citations: string[];
  recorded: boolean;
  answerable: boolean;
  grounded: boolean;
  unknownCitations: string[];
  confidence: Confidence;
};

export type DigResult = {
  evidence: Evidence;
  narrative: Narrative | null;
  error?: string;
};

export type DigRequest = {
  repoPath: string;
  location: string;
  question?: string;
  noCapture?: boolean;
};
