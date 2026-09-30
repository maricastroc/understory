import type { QuoteRange } from "@understory/core/types";
import { withoutTitle } from "../drawer/drawer-body";
import type { InvestigationView, ViewArtifact, ViewClause } from "../model/types";
import { displayId } from "./artifact-copy";
import { gapStatus } from "./gap-copy";
import type { ClauseSource, ProvenanceStep, StatusTone } from "./types";

export function clauseSources(
  clause: ViewClause,
  view: Pick<InvestigationView, "artifacts" | "gaps">,
): ClauseSource[] {
  const byId = new Map(view.artifacts.map((a) => [a.id, a]));
  if (clause.silent) {
    return view.gaps.flatMap((gap) => {
      const after = byId.get(gap.afterId);
      return after ? [{ id: gap.id, type: "gap" as const, gap, after }] : [];
    });
  }
  const cells = clause.cells.length
    ? clause.cells
    : clause.citations.map((citation) => ({ citation, letter: null, state: "cited" as const }));
  return cells.map((cell) => {
    const artifact = byId.get(cell.citation);
    if (!artifact) return { id: cell.citation, type: "missing" as const, citation: cell.citation };
    const quote = artifact.quotes.find((q) => q.clauseId === clause.id && q.range !== null) ?? null;
    return { id: artifact.id, type: "artifact" as const, artifact, cell, quote };
  });
}

export function sourceStatus(
  source: ClauseSource,
  clause: ViewClause,
): { text: string; tone: StatusTone } {
  if (source.type === "gap") {
    return { text: gapStatus(source.gap), tone: source.gap.verified ? "gap" : "neutral" };
  }
  if (source.type === "missing") {
    return { text: "Cited, but never collected · it cannot be checked", tone: "neutral" };
  }
  const state = source.cell?.state ?? "cited";
  if (state === "verified")
    return { text: "✓ Quote found verbatim in the source", tone: "evidence" };
  if (state === "weak") return { text: "Cited · on topic, but no line proves it", tone: "neutral" };
  if (state === "misattributed") {
    return { text: "Cited · this source does not support the clause", tone: "neutral" };
  }
  if (state === "unaudited" || clause.audit === "unaudited") {
    return { text: "Cited · not audited", tone: "neutral" };
  }
  const elsewhere = clause.cells.some((c) => c.state === "verified" && c.citation !== source.id);
  return {
    text: elsewhere
      ? "Cited · the verbatim quote is in another source"
      : "Cited · no verbatim quote in this source",
    tone: "neutral",
  };
}

const UP: Record<string, string> = {
  pull_request: "merged as",
  review: "on",
  issue: "closed by",
};

export function provenance(a: ViewArtifact, all: ViewArtifact[]): ProvenanceStep[] {
  const byId = new Map(all.map((x) => [x.id, x]));
  const steps: ProvenanceStep[] = [{ relation: null, id: displayId(a) }];
  let cur: ViewArtifact | undefined = a;
  for (let i = 0; cur && cur.kind !== "commit" && i < 4; i++) {
    const parent: ViewArtifact | undefined = cur.parentId ? byId.get(cur.parentId) : undefined;
    if (!parent) break;
    steps.push({ relation: UP[cur.kind] ?? "via", id: displayId(parent) });
    cur = parent;
  }
  return steps;
}

export function hostCommit(a: ViewArtifact, all: ViewArtifact[]): ViewArtifact | null {
  const byId = new Map(all.map((x) => [x.id, x]));
  let cur: ViewArtifact | undefined = a;
  for (let i = 0; cur && i < 5; i++) {
    if (cur.kind === "commit") return cur;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return null;
}

export function currentCommit(all: ViewArtifact[]): ViewArtifact | null {
  return all.find((a) => a.kind === "commit" && a.onBore) ?? null;
}

export function lineLabel(location: InvestigationView["location"]): string {
  if (!location) return "the file";
  return location.startLine === location.endLine
    ? `line ${location.startLine}`
    : `lines ${location.startLine}–${location.endLine}`;
}

export function commitRole(
  commit: ViewArtifact | null,
  current: ViewArtifact | null,
  location: InvestigationView["location"],
): string | null {
  if (!commit) return null;
  const line = lineLabel(location);
  return commit.id === current?.id
    ? `wrote ${line} as it reads today`
    : `an earlier change to ${line}`;
}

const AROUND = 150;
const PLAIN = 320;

export function excerpt(
  a: ViewArtifact,
  range: QuoteRange | null,
): { body: string; range: QuoteRange | null } {
  const shown = withoutTitle(a.source.body, a.title, range);
  const body = shown.body.trim() ? shown.body : a.source.body;
  const r = shown.body.trim() ? shown.range : range;
  if (!r) {
    return body.length > PLAIN
      ? { body: `${body.slice(0, PLAIN).replace(/\s+\S*$/, "")} …`, range: null }
      : { body, range: null };
  }
  let start = Math.max(0, r.start - AROUND);
  let end = Math.min(body.length, r.end + AROUND);
  if (start > 0) start = body.indexOf(" ", start) + 1 || start;
  if (end < body.length)
    end = body.lastIndexOf(" ", end) > r.end ? body.lastIndexOf(" ", end) : end;
  const lead = start > 0 ? "… " : "";
  const tail = end < body.length ? " …" : "";
  return {
    body: `${lead}${body.slice(start, end)}${tail}`,
    range: { start: r.start - start + lead.length, end: r.end - start + lead.length },
  };
}
