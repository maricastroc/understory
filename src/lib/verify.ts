/**
 * [5] Verification — deterministic, zero AI. The model can say anything; here
 * we CHECK it. This is what separates a toy that hallucinates from a tool you
 * can trust.
 *
 * Two jobs:
 *   1. Grounding — does every citation resolve to an artifact we actually
 *      collected? A cited id we never gathered is a fabrication.
 *   2. Confidence — a transparent, reproducible score derived from real signals
 *      (did the model abstain? did it fabricate? how many real sources back it?)
 *      — never a number the LLM made up.
 */

import type { Confidence, Evidence, Narrative, VerifiedNarrative } from "./types";

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

/**
 * Check a Narrative against the Evidence it was built from.
 * Pure: same inputs -> same VerifiedNarrative, no side effects, no network.
 */
export function verify(ev: Evidence, n: Narrative): VerifiedNarrative {
  const realIds = new Set(ev.artifacts.map((a) => a.id));
  const cited = unique(n.citations);

  const groundedCitations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id)); // fabrications

  const grounded = unknownCitations.length === 0;

  return {
    ...n,
    grounded,
    unknownCitations,
    confidence: scoreConfidence({
      recorded: n.recorded,
      grounded,
      primarySources: groundedCitations.length,
      totalCollected: ev.artifacts.length,
    }),
  };
}

/**
 * Confidence rubric (v1). Every value maps to an explicit rule, so the number
 * always means something you can point at. It gets richer as we add signals
 * (source-type diversity once PRs/issues land, contradiction detection).
 */
function scoreConfidence(s: {
  recorded: boolean;
  grounded: boolean;
  primarySources: number;
  totalCollected: number;
}): Confidence {
  // Collected artifacts the answer did not directly lean on = supporting context.
  const corroborating = Math.max(0, s.totalCollected - s.primarySources);
  // Not detectable from git alone yet; a future adversarial LLM pass fills this.
  const contradicting = 0;

  let level: Confidence["level"];
  let score: number;

  if (!s.grounded) {
    // The model cited something we never collected — a caught fabrication.
    level = "low";
    score = 0.2;
  } else if (!s.recorded) {
    // Honest abstention: the history genuinely does not explain the why.
    level = "low";
    score = 0.3;
  } else if (s.primarySources === 0) {
    // Claims to have reconstructed the why, but grounded it in nothing.
    level = "low";
    score = 0.35;
  } else if (s.primarySources === 1) {
    level = "medium";
    score = 0.65;
  } else {
    // Two or more independent, real sources back the claim.
    level = "high";
    score = 0.9;
  }

  return { score, level, primarySources: s.primarySources, corroborating, contradicting };
}
