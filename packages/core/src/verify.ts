import type { Confidence, Entailment, Evidence, Narrative, VerifiedNarrative } from "./types";

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

export function verify(ev: Evidence, n: Narrative, entailment?: Entailment): VerifiedNarrative {
  const realIds = new Set(ev.artifacts.map((a) => a.id));
  const cited = unique(n.citations);

  const groundedCitations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id));

  const grounded = unknownCitations.length === 0;

  const citedSet = new Set(groundedCitations);
  const contradicting = ev.contradictions.filter((c) => citedSet.has(c.artifactId)).length;

  // A grounded citation only lifts confidence when the entailment judge could
  // substantiate it from the source. Unchecked citations stay neutral (count as
  // primary), so behaviour is identical when no entailment was run.
  const status = new Map(
    (entailment?.checked ? entailment.checks : []).map((c) => [c.citation, c.status]),
  );
  const effectivePrimary = groundedCitations.filter((id) => {
    const s = status.get(id);
    return s === undefined || s === "supported";
  }).length;

  return {
    ...n,
    grounded,
    unknownCitations,
    confidence: scoreConfidence({
      recorded: n.recorded,
      grounded,
      primarySources: groundedCitations.length,
      effectivePrimary,
      totalCollected: ev.artifacts.length,
      contradicting,
    }),
    ...(entailment?.checked ? { entailment } : {}),
  };
}

function scoreConfidence(s: {
  recorded: boolean;
  grounded: boolean;
  primarySources: number;
  effectivePrimary: number;
  totalCollected: number;
  contradicting: number;
}): Confidence {
  const corroborating = Math.max(0, s.totalCollected - s.primarySources);
  const { contradicting, effectivePrimary } = s;

  let level: Confidence["level"];
  let score: number;

  if (!s.grounded) {
    level = "low";
    score = 0.2;
  } else if (!s.recorded) {
    level = "low";
    score = 0.3;
  } else if (effectivePrimary === 0) {
    level = "low";
    score = 0.35;
  } else if (effectivePrimary === 1) {
    level = "medium";
    score = 0.65;
  } else {
    level = "high";
    score = 0.9;
  }

  if (s.grounded && s.recorded && contradicting > 0) {
    if (contradicting >= effectivePrimary) {
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
