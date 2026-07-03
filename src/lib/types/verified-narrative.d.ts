import type { Confidence } from "./confidence";
import type { Narrative } from "./narrative";

export type VerifiedNarrative = Narrative & {
  grounded: boolean;
  // cited ids that were never collected = fabrication
  unknownCitations: string[];
  confidence: Confidence;
};
