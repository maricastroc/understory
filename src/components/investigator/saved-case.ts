import type { DigResult } from "@understory/core/types";

export type SavedCase = {
  caseId: string;
  question: string;
  repoPath: string;
  location: string;
  result: DigResult;
  parentCaseId?: string | null;
};
