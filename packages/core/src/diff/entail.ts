import { type Auditor, runAudit } from "../auditor";
import { canonicalCitations } from "../citation-id";
import { entailClaims, judgeCitation } from "../entail";
import type { Artifact, CitationCheck, Entailment } from "../types";
import { clusterRef } from "./synthesize";
import type { DiffCluster, DiffNarrative } from "./types";

const MAX_DIFF_CHECKS = 8;

const DIFF_QUESTION = "Why does the existing code being changed here exist, and what was it for?";

const ENTAIL_CLUSTER_CAP = 6;
const ENTAIL_ARTIFACT_CAP = 12;

export function diffEntailmentAffordable(clusters: DiffCluster[]): boolean {
  const totalArtifacts = clusters.reduce((n, c) => n + c.artifacts.length, 0);
  return clusters.length <= ENTAIL_CLUSTER_CAP && totalArtifacts <= ENTAIL_ARTIFACT_CAP;
}

type Task = { ref: string; why: string; artifact: Artifact };

type RegionAudit = { checks: CitationCheck[]; failed: number; fallbacks: number };

export async function checkDiffEntailment(
  clusters: DiffCluster[],
  narrative: DiffNarrative,
  auditor: Auditor,
): Promise<{ byRef: Map<string, Entailment>; summary: Entailment }> {
  const byRefFinding = new Map(narrative.findings.map((f) => [f.cluster.trim().toUpperCase(), f]));
  const known = new Set(clusters.flatMap((c) => c.artifacts.map((a) => a.id)));

  const tasks: Task[] = [];
  clusters.forEach((cluster, i) => {
    const ref = clusterRef(i);
    const raw = byRefFinding.get(ref);
    if (!raw || !raw.recorded) return;
    const byId = new Map(cluster.artifacts.map((a) => [a.id, a]));
    for (const id of new Set(canonicalCitations(raw.citations, known))) {
      const artifact = byId.get(id);
      if (artifact) tasks.push({ ref, why: raw.why, artifact });
    }
  });
  const chosen = tasks.slice(0, MAX_DIFF_CHECKS);

  const allById = new Map(clusters.flatMap((c) => c.artifacts).map((a) => [a.id, a]));
  const [settled, summary] = await Promise.all([
    Promise.allSettled(
      chosen.map((t) =>
        runAudit(auditor, (model) => judgeCitation(DIFF_QUESTION, t.why, t.artifact, model)),
      ),
    ),
    entailClaims(DIFF_QUESTION, narrative.summaryClaims, allById, auditor),
  ]);

  const regions = new Map<string, RegionAudit>();
  settled.forEach((s, idx) => {
    const ref = chosen[idx].ref;
    const region = regions.get(ref) ?? { checks: [], failed: 0, fallbacks: 0 };
    if (s.status !== "fulfilled") region.failed++;
    else {
      region.checks.push(s.value.value);
      if (s.value.fellBack) region.fallbacks++;
    }
    regions.set(ref, region);
  });

  const byRef = new Map<string, Entailment>();
  for (const [ref, { checks, failed, fallbacks }] of regions) {
    byRef.set(ref, {
      checked: checks.length > 0,
      checks,
      supported: checks.filter((c) => c.status === "supported").length,
      misattributed: checks.filter((c) => c.status === "unsupported").length,
      failed,
      fallbacks,
    });
  }
  return { byRef, summary };
}

export function failedAuditChecks(
  byRef: Map<string, Entailment> | undefined,
  summary: Entailment | undefined,
): number {
  const regions = [...(byRef?.values() ?? [])].reduce((n, e) => n + (e.failed ?? 0), 0);
  return regions + (summary?.failed ?? 0);
}
