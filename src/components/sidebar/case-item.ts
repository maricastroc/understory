import type { Confidence } from "@git-investigator/core/types";

export type CaseItem = {
  caseId: string;
  question: string;
  repoName: string;
  location: string;
  recorded: boolean;
  answerable: boolean;
  hasNarrative: boolean;
  level: Confidence["level"];
  score: number;
  child: boolean;
  // Evidence is shown but the conclusion is still being reconstructed.
  pending: boolean;
};
