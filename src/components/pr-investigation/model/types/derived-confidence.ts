import type { Confidence } from "@git-investigator/core/types";

export type DerivedConfidence = {
  score: number;
  lowest: Confidence["level"];
  highest: Confidence["level"];
};
