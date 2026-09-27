import type { ChecklistItem, Verdict } from "../model/types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  pending: "Reconstructing…",
  "evidence-only": "Evidence only",
  "out-of-scope": "Out of scope",
  fabrication: "Fabrication caught",
  "not-recorded": "Not recorded",
  resolved: "Resolved",
};

export const VERDICT_TITLE: Record<Verdict, string> = {
  pending: "Still reconstructing",
  "evidence-only": "Why there is no reconstruction",
  "out-of-scope": "Why this is out of scope",
  fabrication: "Why a fabrication was caught",
  "not-recorded": "Why this is not recorded",
  resolved: "Why this is resolved",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function checklistText(item: ChecklistItem): string {
  switch (item.kind) {
    case "clauses-grounded":
      return `${item.grounded} of ${plural(item.total, "clause")} rest on recorded sources`;
    case "citations-resolved":
      return item.unknown.length
        ? `${item.resolved} of ${plural(item.total, "citation")} resolve; ${item.unknown.join(", ")} was never collected`
        : `${item.resolved} of ${plural(item.total, "citation")} resolve to real artifacts`;
    case "quotes": {
      const parts = [`${plural(item.verified, "quote")} found verbatim`];
      parts.push(`${item.misattributed} misattributed`);
      if (item.weak) parts.push(`${item.weak} weak`);
      if (item.unaudited) parts.push(`${item.unaudited} not audited`);
      return parts.join(", ");
    }
    case "audit-unavailable":
      return "Citation audit unavailable; confidence is capped";
    case "uncited-claims":
      return `${plural(item.count, "clause")} cite nothing that was collected`;
    case "contradictions":
      return item.items.map((c) => `${c.artifactId}: ${c.detail}`).join("; ");
    case "file-granularity":
      return item.note ?? "File-level history only, not line-level";
    case "collection-note":
      return item.note;
    case "cosmetic-origin":
      return `The last change, ${item.ref}, looks cosmetic`;
    case "not-recorded":
      return item.answer;
    case "out-of-scope":
      return item.answer;
    case "evidence-only":
      return item.error ?? "No reconstruction was produced";
  }
}

export function checklistGlyph(item: ChecklistItem): string {
  if (item.tone === "ok") return "✓";
  if (item.tone === "silent") return "◌";
  if (item.tone === "caveat") return "!";
  return "·";
}
