import type { Confidence, Entailment, Evidence, Narrative, VerifiedNarrative } from "./types";

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

export function verify(ev: Evidence, n: Narrative, entailment?: Entailment): VerifiedNarrative {
  const realIds = new Set(ev.artifacts.map((a) => a.id));
  const cited = unique(n.citations);

  const groundedCitations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id));

  const grounded = unknownCitations.length === 0;

  // Per-claim grounding: a claim is grounded when at least one of its citations resolves
  // to a collected artifact. A claim citing nothing is uncited interpolation — prose with
  // no source — which entailment never sees (it audits citations, and there is none), so
  // this deterministic gate is the only thing that catches it.
  const claims = n.claims.map((c) => ({
    ...c,
    grounded: c.citations.some((id) => realIds.has(id)),
  }));
  const ungroundedClaims = claims.filter((c) => !c.grounded).length;
  const groundedClaims = claims.length - ungroundedClaims;

  const citedSet = new Set(groundedCitations);
  const contradicting = ev.contradictions.filter((c) => citedSet.has(c.artifactId)).length;

  const audited = entailment?.checked === true;
  const status = new Map(
    (audited ? entailment!.checks : []).map((c) => [c.citation, c.status]),
  );
  // A citation only fails when the judge actively refuted it. Everything else —
  // supported, weak, or (past MAX_CHECKS) unjudged — stays a primary source.
  const effectivePrimary = groundedCitations.filter(
    (id) => status.get(id) !== "unsupported",
  ).length;
  // But only a judge-substantiated, quote-verified "supported" earns HIGH.
  const supportedPrimary = groundedCitations.filter(
    (id) => status.get(id) === "supported",
  ).length;

  return {
    ...n,
    claims,
    grounded,
    unknownCitations,
    ungroundedClaims,
    confidence: scoreConfidence({
      recorded: n.recorded,
      grounded,
      primarySources: groundedCitations.length,
      effectivePrimary,
      supportedPrimary,
      audited,
      ungroundedClaims,
      groundedClaims,
      totalCollected: ev.artifacts.length,
      contradicting,
    }),
    ...(audited ? { entailment } : {}),
  };
}

export function scoreConfidence(s: {
  recorded: boolean;
  grounded: boolean;
  primarySources: number;
  effectivePrimary: number;
  supportedPrimary: number;
  audited: boolean;
  ungroundedClaims: number;
  groundedClaims: number;
  totalCollected: number;
  contradicting: number;
}): Confidence {
  const corroborating = Math.max(0, s.totalCollected - s.primarySources);
  const { contradicting, effectivePrimary, supportedPrimary, audited } = s;

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
  } else if (!audited) {
    // No completed citation audit ran (disabled, rate-limited, or it threw). The
    // citations are grounded, but their support is unverified — never award HIGH on
    // citation count alone; the entailment pass is what earns it.
    level = "medium";
    score = 0.5;
  } else if (supportedPrimary >= 2) {
    // Two or more sources the judge substantiated in-source, each proven by a
    // verbatim quote. This is the only path to HIGH.
    level = "high";
    score = 0.9;
  } else if (supportedPrimary === 1) {
    level = "medium";
    score = 0.65;
  } else {
    // Audited and on-topic, but no single line proves the point (weak-only). "weak"
    // is a real source, so it stays medium — but it does not count toward HIGH.
    level = "medium";
    score = 0.55;
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

  // A claim that cites no collected source is uncited interpolation: it cannot raise
  // confidence, and it lowers the ceiling. A partly-uncited answer is never HIGH; one
  // that is at least half uncited is LOW. Applied as a cap so it only ever lowers.
  if (s.grounded && s.recorded && s.ungroundedClaims > 0) {
    if (s.ungroundedClaims >= s.groundedClaims && score > 0.4) {
      level = "low";
      score = 0.4;
    } else if (level === "high") {
      level = "medium";
      score = 0.55;
    }
  }

  return { score, level, primarySources: s.primarySources, corroborating, contradicting };
}
