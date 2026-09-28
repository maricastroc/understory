import type { DigResult } from "@git-investigator/core/types";

export type SavedCase = {
  caseId: string;
  question: string;
  repoPath: string;
  location: string;
  result: DigResult;
  parentCaseId?: string | null;
};
