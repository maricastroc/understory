import type { Confidence } from "./confidence";
import type { Entailment } from "./entailment";
import type { Narrative } from "./narrative";
import type { VerifiedClaim } from "./verified-claim";

export type VerifiedNarrative = Omit<Narrative, "claims"> & {
  claims: VerifiedClaim[];
  grounded: boolean;
  unknownCitations: string[];
  // How many claims cite no collected source — uncited interpolation the reader is shown
  // but the scorer does not count. 0 means every sentence is backed by an artifact.
  ungroundedClaims: number;
  confidence: Confidence;
  entailment?: Entailment;
};
