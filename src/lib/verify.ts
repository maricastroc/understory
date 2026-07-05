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

export function verify(ev: Evidence, n: Narrative): VerifiedNarrative {
  const realIds = new Set(ev.artifacts.map((a) => a.id));
  const cited = unique(n.citations);

  const groundedCitations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id));

  const grounded = unknownCitations.length === 0;

  const citedSet = new Set(groundedCitations);
  const contradicting = ev.contradictions.filter((c) => citedSet.has(c.artifactId)).length;

  return {
    ...n,
    grounded,
    unknownCitations,
    confidence: scoreConfidence({
      recorded: n.recorded,
      grounded,
      primarySources: groundedCitations.length,
      totalCollected: ev.artifacts.length,
      contradicting,
    }),
  };
}

function scoreConfidence(s: {
  recorded: boolean;
  grounded: boolean;
  primarySources: number;
  totalCollected: number;
  contradicting: number;
}): Confidence {
  const corroborating = Math.max(0, s.totalCollected - s.primarySources);
  const { contradicting } = s;

  let level: Confidence["level"];
  let score: number;

  if (!s.grounded) {
    level = "low";
    score = 0.2;
  } else if (!s.recorded) {
    level = "low";
    score = 0.3;
  } else if (s.primarySources === 0) {
    level = "low";
    score = 0.35;
  } else if (s.primarySources === 1) {
    level = "medium";
    score = 0.65;
  } else {
    level = "high";
    score = 0.9;
  }

  if (s.grounded && s.recorded && contradicting > 0) {
    if (contradicting >= s.primarySources) {
      level = "low";
      score = 0.3;
    } else if (level === "high") {
      level = "medium";
      score = 0.55;
    } else {
      level = "low";
      score = 0.4;
    }
  }

  return { score, level, primarySources: s.primarySources, corroborating, contradicting };
}
