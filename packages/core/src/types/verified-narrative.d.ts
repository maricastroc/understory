import type { Confidence } from "./confidence";
import type { Entailment } from "./entailment";
import type { Narrative } from "./narrative";
import type { VerifiedClaim } from "./verified-claim";

export type VerifiedNarrative = Omit<Narrative, "claims"> & {
  claims: VerifiedClaim[];
  grounded: boolean;
  unknownCitations: string[];
  ungroundedClaims: number;
  confidence: Confidence;
  entailment?: Entailment;
};
