import type { Confidence } from "./confidence";
import type { Narrative } from "./narrative";

export type VerifiedNarrative = Narrative & {
  grounded: boolean;
  unknownCitations: string[];
  confidence: Confidence;
};
