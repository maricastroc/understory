import { entailClaims, judgeCitation } from "../entail";
import type { Model } from "../llm";
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

export async function checkDiffEntailment(
  clusters: DiffCluster[],
  narrative: DiffNarrative,
  model: Model,
): Promise<{ byRef: Map<string, Entailment>; summary: Entailment }> {
  const byRefFinding = new Map(narrative.findings.map((f) => [f.cluster.trim().toUpperCase(), f]));

  const tasks: Task[] = [];
  clusters.forEach((cluster, i) => {
    const ref = clusterRef(i);
    const raw = byRefFinding.get(ref);
    if (!raw || !raw.recorded) return;
    const byId = new Map(cluster.artifacts.map((a) => [a.id, a]));
    for (const id of new Set(raw.citations)) {
      const artifact = byId.get(id);
      if (artifact) tasks.push({ ref, why: raw.why, artifact });
    }
  });
  const chosen = tasks.slice(0, MAX_DIFF_CHECKS);

  const allById = new Map(clusters.flatMap((c) => c.artifacts).map((a) => [a.id, a]));
  const [settled, summary] = await Promise.all([
    Promise.allSettled(chosen.map((t) => judgeCitation(DIFF_QUESTION, t.why, t.artifact, model))),
    entailClaims(DIFF_QUESTION, narrative.summaryClaims, allById, model),
  ]);

  const checksByRef = new Map<string, CitationCheck[]>();
  settled.forEach((s, idx) => {
    if (s.status !== "fulfilled") return;
    const ref = chosen[idx].ref;
    const list = checksByRef.get(ref) ?? [];
    list.push(s.value);
    checksByRef.set(ref, list);
  });

  const byRef = new Map<string, Entailment>();
  for (const [ref, checks] of checksByRef) {
    byRef.set(ref, {
      checked: true,
      checks,
      supported: checks.filter((c) => c.status === "supported").length,
      misattributed: checks.filter((c) => c.status === "unsupported").length,
    });
  }
  return { byRef, summary };
}
