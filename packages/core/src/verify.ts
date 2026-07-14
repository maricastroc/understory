import { cosmeticOrigin } from "./cosmetic";
import { traceProvenance } from "./provenance";
import type {
  Confidence,
  EntailmentStatus,
  Entailment,
  Evidence,
  Narrative,
  VerifiedNarrative,
} from "./types";

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

export function verify(ev: Evidence, n: Narrative, entailment?: Entailment): VerifiedNarrative {
  const realIds = new Set(ev.artifacts.map((a) => a.id));
  const cited = unique(n.citations);

  const groundedCitations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id));

  const grounded = unknownCitations.length === 0;

  const claims = n.claims.map((c) => ({
    ...c,
    grounded: c.citations.some((id) => realIds.has(id)),
  }));
  const ungroundedClaims = claims.filter((c) => !c.grounded).length;
  const groundedClaims = claims.length - ungroundedClaims;

  const citedSet = new Set(groundedCitations);
  const contradicting = ev.contradictions.filter((c) => citedSet.has(c.artifactId)).length;

  const audited = entailment?.checked === true;
  const checks = audited && entailment ? entailment.checks : [];

  const groupStatus = new Map<string, EntailmentStatus>();
  for (const c of checks) {
    groupStatus.set(c.claim !== undefined ? `c${c.claim}` : `x${c.citation}`, c.status);
  }
  const verdicts = [...groupStatus.values()];

  const effectivePrimary = audited
    ? verdicts.filter((s) => s !== "unsupported").length
    : groundedCitations.length;

  const supportedPrimary = verdicts.filter((s) => s === "supported").length;

  const provenance = traceProvenance(ev);
  const ownerIds = new Set<string>(
    provenance ? [provenance.commit, ...(provenance.pr ? [provenance.pr] : [])] : [],
  );
  const ownerSelfExplains =
    ownerIds.size > 0 &&
    n.claims.some(
      (c, i) =>
        c.citations.length > 0 &&
        c.citations.every((id) => ownerIds.has(id)) &&
        checks.some((k) => k.claim === i && k.status === "supported" && !!k.quote),
    );
  const misattributed = audited && entailment ? entailment.misattributed : 0;

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
      coarseGranularity: ev.coverage?.granularity === "file",
      cosmeticOrigin: cosmeticOrigin(ev) !== null,
      ownerSelfExplains,
      misattributed,
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
  coarseGranularity: boolean;
  cosmeticOrigin?: boolean;
  ownerSelfExplains?: boolean;
  misattributed?: number;
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
    level = "medium";
    score = 0.5;
  } else if (supportedPrimary >= 2) {
    level = "high";
    score = 0.9;
  } else if (s.ownerSelfExplains && !s.coarseGranularity && (s.misattributed ?? 0) === 0) {
    level = "high";
    score = 0.85;
  } else if (supportedPrimary === 1) {
    level = "medium";
    score = 0.65;
  } else {
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

  if (s.grounded && s.recorded && s.ungroundedClaims > 0) {
    if (s.ungroundedClaims >= s.groundedClaims && score > 0.4) {
      level = "low";
      score = 0.4;
    } else if (level === "high") {
      level = "medium";
      score = 0.55;
    }
  }

  if (s.coarseGranularity && level === "high") {
    level = "medium";
    score = 0.55;
  }

  if (s.cosmeticOrigin && level === "high") {
    level = "medium";
    score = 0.55;
  }

  return { score, level, primarySources: s.primarySources, corroborating, contradicting };
}
