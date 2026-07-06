export type InvestigateInput = {
  repoPath: string;
  location: string;
  question: string;
  /** Per-request opt-out of anonymous question logging; not persisted. */
  noCapture?: boolean;
};
