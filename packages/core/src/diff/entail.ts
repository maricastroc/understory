import { judgeCitation } from "../entail";
import type { Model } from "../llm";
import type { Artifact, CitationCheck, Entailment } from "../types";
import { clusterRef } from "./synthesize";
import type { DiffCluster, DiffNarrative } from "./types";

// One cap across the whole PR so a large diff can't fan out into dozens of judge calls.
// Mirrors entail.ts's MAX_CHECKS but budgets the pull request as a whole; clusters are
// already rank-sorted, so the most important regions are audited first.
const MAX_DIFF_CHECKS = 8;

const DIFF_QUESTION = "Why does the existing code being changed here exist, and what was it for?";

type Task = { ref: string; why: string; artifact: Artifact };

// Second LLM pass over the PR findings — the diff-flow twin of checkEntailment: for each
// recorded finding, audit that its cited sources actually substantiate the claim. Returns
// the entailment keyed by region ref; verifyDiff feeds it into the same confidence scorer,
// so a real-but-irrelevant citation is demoted here just as it is on the line flow.
export async function checkDiffEntailment(
  clusters: DiffCluster[],
  narrative: DiffNarrative,
  model: Model,
): Promise<Map<string, Entailment>> {
  const byRef = new Map(narrative.findings.map((f) => [f.cluster.trim().toUpperCase(), f]));

  const tasks: Task[] = [];
  clusters.forEach((cluster, i) => {
    const ref = clusterRef(i);
    const raw = byRef.get(ref);
    if (!raw || !raw.recorded) return; // gate off abstentions, exactly like checkEntailment
    const byId = new Map(cluster.artifacts.map((a) => [a.id, a]));
    for (const id of new Set(raw.citations)) {
      const artifact = byId.get(id);
      if (artifact) tasks.push({ ref, why: raw.why, artifact });
    }
  });
  if (tasks.length === 0) return new Map();

  const chosen = tasks.slice(0, MAX_DIFF_CHECKS);
  const settled = await Promise.allSettled(
    chosen.map((t) => judgeCitation(DIFF_QUESTION, t.why, t.artifact, model)),
  );

  const checksByRef = new Map<string, CitationCheck[]>();
  settled.forEach((s, idx) => {
    if (s.status !== "fulfilled") return;
    const ref = chosen[idx].ref;
    const list = checksByRef.get(ref) ?? [];
    list.push(s.value);
    checksByRef.set(ref, list);
  });

  const out = new Map<string, Entailment>();
  for (const [ref, checks] of checksByRef) {
    out.set(ref, {
      checked: true,
      checks,
      supported: checks.filter((c) => c.status === "supported").length,
      misattributed: checks.filter((c) => c.status === "unsupported").length,
    });
  }
  return out;
}
