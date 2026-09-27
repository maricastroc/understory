import { cosmeticOrigin } from "@git-investigator/core/cosmetic";
import type { DigResult } from "@git-investigator/core/types";
import type { ChecklistItem, ViewClause, ViewQuote } from "./types";

function evidenceCaveats(result: DigResult): ChecklistItem[] {
  const ev = result.evidence;
  const items: ChecklistItem[] = [];
  if (ev.coverage?.granularity === "file") {
    items.push({ kind: "file-granularity", tone: "caveat", note: ev.note ?? null });
  } else if (ev.note) {
    items.push({ kind: "collection-note", tone: "caveat", note: ev.note });
  }
  const cosmetic = cosmeticOrigin(ev);
  if (cosmetic) {
    items.push({ kind: "cosmetic-origin", tone: "caveat", ref: cosmetic.ref ?? cosmetic.id });
  }
  return items;
}

export function deriveChecklist(
  result: DigResult,
  clauses: ViewClause[],
  audited: boolean,
  quotes: Map<string, ViewQuote[]>,
): ChecklistItem[] {
  const n = result.narrative;
  const ev = result.evidence;

  if (!n) {
    return [
      { kind: "evidence-only", tone: "scope", error: result.error ?? null },
      ...evidenceCaveats(result),
    ];
  }
  if (n.answerable === false) return [{ kind: "out-of-scope", tone: "scope", answer: n.answer }];
  if (!n.recorded) {
    return [{ kind: "not-recorded", tone: "silent", answer: n.answer }, ...evidenceCaveats(result)];
  }

  const items: ChecklistItem[] = [];
  const grounded = clauses.filter((c) => c.grounded).length;
  items.push({
    kind: "clauses-grounded",
    tone: grounded === clauses.length ? "ok" : "caveat",
    grounded,
    total: clauses.length,
  });

  const citations = Array.from(new Set(n.citations ?? []));
  const known = new Set(ev.artifacts.map((a) => a.id));
  const resolved = citations.filter((id) => known.has(id));
  const unknown = n.unknownCitations ?? citations.filter((id) => !known.has(id));
  items.push({
    kind: "citations-resolved",
    tone: unknown.length === 0 ? "ok" : "caveat",
    resolved: resolved.length,
    total: citations.length,
    unknown,
  });

  if (audited) {
    const verified = [...quotes.values()].reduce((sum, list) => sum + list.length, 0);
    const count = (audit: ViewClause["audit"]) => clauses.filter((c) => c.audit === audit).length;
    const misattributed = count("unsupported");
    items.push({
      kind: "quotes",
      tone: misattributed === 0 ? "ok" : "caveat",
      verified,
      weak: count("weak"),
      misattributed,
      unaudited: count("unaudited"),
    });
  } else if (n.grounded && resolved.length > 0) {
    items.push({ kind: "audit-unavailable", tone: "caveat" });
  }

  if ((n.ungroundedClaims ?? 0) > 0) {
    items.push({ kind: "uncited-claims", tone: "caveat", count: n.ungroundedClaims });
  }

  const cited = new Set(resolved);
  const contradictions = ev.contradictions.filter((c) => cited.has(c.artifactId));
  if (contradictions.length > 0) {
    items.push({ kind: "contradictions", tone: "caveat", items: contradictions });
  }

  return [...items, ...evidenceCaveats(result)];
}
