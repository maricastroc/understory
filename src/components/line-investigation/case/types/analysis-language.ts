import type { NarrativeLanguage } from "@understory/core/types";

export type AnalysisLanguage = {
  selected: NarrativeLanguage;
  rewriting: boolean;
  onSelect: (language: NarrativeLanguage) => void;
};
