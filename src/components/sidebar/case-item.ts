import type { Confidence } from "@/lib/types";

export type CaseItem = {
  caseId: string;
  question: string;
  recorded: boolean;
  hasNarrative: boolean;
  level: Confidence["level"];
  score: number;
};
