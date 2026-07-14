import type { Entailment } from "../types";
import { scoreConfidence } from "../verify";
import { clusterRef } from "./synthesize";
import type {
  DiffCluster,
  DiffCollection,
  DiffNarrative,
  DiffResult,
  RawDiffFinding,
  VerifiedDiffFinding,
} from "./types";

const unique = (xs: string[]): string[] => Array.from(new Set(xs));

function silentFinding(ref: string, cluster: DiffCluster): VerifiedDiffFinding {
  return {
    ref,
    targets: cluster.targets,
    why: "",
    citations: [],
    unknownCitations: [],
    grounded: true,
    recorded: false,
    confidence: scoreConfidence({
      recorded: false,
      grounded: true,
      primarySources: 0,
      effectivePrimary: 0,
      supportedPrimary: 0,
      audited: false,
      ungroundedClaims: 0,
      groundedClaims: 0,
      coarseGranularity: false,
      totalCollected: cluster.artifacts.length,
      contradicting: 0,
    }),
    artifacts: cluster.artifacts,
    contradictions: cluster.contradictions,
  };
}

function verifyFinding(
  ref: string,
  cluster: DiffCluster,
  raw: RawDiffFinding,
  realIds: Set<string>,
  entailment?: Entailment,
): VerifiedDiffFinding {
  const cited = unique(raw.citations);
  const citations = cited.filter((id) => realIds.has(id));
  const unknownCitations = cited.filter((id) => !realIds.has(id));
  const grounded = unknownCitations.length === 0;

  const citedSet = new Set(citations);
  const contradicting = cluster.contradictions.filter((c) => citedSet.has(c.artifactId)).length;

  // Same rule as the line flow's verify: only a "unsupported" verdict (a real
  // misattribution) demotes a citation from "primary"; "supported"/"weak"/unjudged
  // stay primary. But HIGH is reserved for judge-substantiated "supported" sources,
  // and an absent audit caps confidence — see scoreConfidence.
  const audited = entailment?.checked === true;
  const status = new Map(
    (audited ? entailment!.checks : []).map((c) => [c.citation, c.status]),
  );
  const effectivePrimary = citations.filter((id) => status.get(id) !== "unsupported").length;
  const supportedPrimary = citations.filter((id) => status.get(id) === "supported").length;

  return {
    ref,
    targets: cluster.targets,
    why: raw.why,
    citations,
    unknownCitations,
    grounded,
    recorded: raw.recorded,
    confidence: scoreConfidence({
      recorded: raw.recorded,
      grounded,
      primarySources: citations.length,
      effectivePrimary,
      supportedPrimary,
      audited,
      // The diff flow's finer unit is the per-region `why`, already citation-bound; it has
      // no free-prose claims to gate (that parity is a follow-up).
      ungroundedClaims: 0,
      groundedClaims: 0,
      // Every diff cluster is blamed line-level against the base commit.
      coarseGranularity: false,
      totalCollected: cluster.artifacts.length,
      contradicting,
    }),
    artifacts: cluster.artifacts,
    contradictions: cluster.contradictions,
    ...(entailment?.checked ? { entailment } : {}),
  };
}

export function verifyDiff(
  col: DiffCollection,
  narrative: DiffNarrative,
  entailByRef?: Map<string, Entailment>,
): DiffResult {
  const realIds = new Set(col.clusters.flatMap((c) => c.artifacts.map((a) => a.id)));
  const byRef = new Map(narrative.findings.map((f) => [f.cluster.trim().toUpperCase(), f]));

  const findings = col.clusters.map((cluster, i) => {
    const ref = clusterRef(i);
    const raw = byRef.get(ref);
    return raw
      ? verifyFinding(ref, cluster, raw, realIds, entailByRef?.get(ref))
      : silentFinding(ref, cluster);
  });

  return {
    repo: col.repo,
    pr: col.pr,
    triage: col.triage,
    summary: narrative.summary,
    findings,
    note: col.note,
  };
}

export function collectionToResult(col: DiffCollection, error?: string): DiffResult {
  return {
    repo: col.repo,
    pr: col.pr,
    triage: col.triage,
    summary: "",
    findings: col.clusters.map((cluster, i) => silentFinding(clusterRef(i), cluster)),
    note: col.note,
    error,
  };
}
