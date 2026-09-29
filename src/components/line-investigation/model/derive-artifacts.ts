import type { Artifact, Evidence, PrLookup } from "@understory/core/types";
import { timeOf } from "./depth-order";
import type { ViewArtifact, ViewClause, ViewQuote } from "./types";

const DAY = 86_400_000;
const LOOKUPS: readonly PrLookup[] = ["found", "none", "skipped", "failed"];

function metaString(a: Artifact, key: string): string | null {
  const v = a.meta?.[key];
  return typeof v === "string" && v ? v : null;
}

function prLookupOf(a: Artifact): PrLookup | null {
  const v = metaString(a, "prLookup");
  return v && (LOOKUPS as readonly string[]).includes(v) ? (v as PrLookup) : null;
}

function boreMembership(evidence: Evidence, cited: Set<string>): (a: Artifact) => boolean {
  if (evidence.coverage?.granularity !== "file") return (a) => timeOf(a.date) !== null;
  const byId = new Map(evidence.artifacts.map((a) => [a.id, a]));
  const near = new Set<string>();
  for (const id of cited) {
    near.add(id);
    const parent = byId.get(id)?.parentId;
    if (parent) near.add(parent);
  }
  for (const a of evidence.artifacts) if (a.parentId && cited.has(a.parentId)) near.add(a.id);
  return (a) => near.has(a.id) && timeOf(a.date) !== null;
}

export function deriveArtifacts(
  evidence: Evidence,
  ordered: Artifact[],
  letters: Map<string, string>,
  clauses: ViewClause[],
  quotes: Map<string, ViewQuote[]>,
  now: number,
): ViewArtifact[] {
  const citedBy = new Map<string, string[]>();
  for (const c of clauses) {
    for (const id of c.citations) citedBy.set(id, [...(citedBy.get(id) ?? []), c.id]);
  }
  const onBore = boreMembership(evidence, new Set(citedBy.keys()));

  return ordered.map((a) => {
    const t = timeOf(a.date);
    const refs = citedBy.get(a.id) ?? [];
    return {
      id: a.id,
      kind: a.kind,
      letter: letters.get(a.id)!,
      title: a.title,
      date: a.date,
      endDate: a.kind === "pull_request" ? metaString(a, "mergedAt") : null,
      daysBeforeNow: t === null ? null : (now - t) / DAY,
      role: refs.length > 0 ? "cited" : "supporting",
      citedBy: refs,
      verified: (quotes.get(a.id) ?? []).length > 0,
      quotes: quotes.get(a.id) ?? [],
      onBore: onBore(a),
      parentId: a.parentId ?? null,
      reviewState: a.kind === "review" ? metaString(a, "state") : null,
      prLookup: a.kind === "commit" ? prLookupOf(a) : null,
      source: a,
    };
  });
}
