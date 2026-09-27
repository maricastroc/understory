import type { PopoverRow } from "../../line-investigation/verdict/popover-row";
import type { CoverageItem, PrView } from "../model/types";
import { listOf } from "./region-copy";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function row(item: CoverageItem, i: number): PopoverRow {
  const key = `${item.kind}-${i}`;
  switch (item.kind) {
    case "regions":
      return {
        key,
        glyph: "✓",
        tone: "ok",
        text: `${item.explained} of ${plural(item.total, "region")} recorded and grounded`,
      };
    case "silent":
      return {
        key,
        glyph: "◌",
        tone: "silent",
        clay: true,
        text: item.directCommits
          ? `${listOf(item.regions)} ${item.regions.length === 1 ? "ends" : "end"} at direct commits: not recorded`
          : `${listOf(item.regions)}: no recorded reason`,
      };
    case "partial":
      return {
        key,
        glyph: "!",
        tone: "caveat",
        text: `${item.region} is partly recorded: ${item.explained} of ${plural(item.total, "origin commit")} explained`,
      };
    case "citations":
      return {
        key,
        glyph: item.unknown.length ? "!" : "✓",
        tone: item.unknown.length ? "caveat" : "ok",
        text: item.unknown.length
          ? `${item.resolved} of ${plural(item.total, "citation")} resolve; ${item.unknown.join(", ")} was never collected`
          : `${item.resolved} of ${plural(item.total, "citation")} resolve, ${item.misattributed} misattributed`,
      };
    case "quotes":
      return {
        key,
        glyph: "✓",
        tone: "ok",
        text: `${plural(item.verified, "quote")} found verbatim`,
      };
    case "audit-unavailable":
      return {
        key,
        glyph: "!",
        tone: "caveat",
        text: `Quotes were not audited for ${listOf(item.regions)}`,
      };
    case "contradictions":
      return {
        key,
        glyph: "!",
        tone: "caveat",
        text: item.items
          .map((c) => `${c.artifactId} was ${c.kind === "revert" ? "reverted" : c.kind}`)
          .join("; "),
      };
    case "evidence-only":
      return {
        key,
        glyph: "·",
        tone: "scope",
        text: item.error ? `No reconstruction: ${item.error}` : "No reconstruction",
      };
    case "truncated":
      return {
        key,
        glyph: "!",
        tone: "caveat",
        text: `Only ${item.investigated} of ${plural(item.blamed, "changed region")} were investigated`,
      };
    case "note":
      return { key, glyph: "·", tone: "scope", text: item.note };
  }
}

export function coverageRows(view: PrView): PopoverRow[] {
  return view.coverage.map(row);
}

export function coverageDetails(view: PrView): string[] {
  const u = view.upstream;
  const t = view.triage;
  return [
    `Distinct upstream: ${plural(u.commits, "commit")} · ${plural(u.prs, "PR")} · ${plural(u.issues, "issue")} · ${plural(u.reviews, "review")}`,
    `${plural(t.filesChanged, "file")} changed · ${t.filesConsidered} with history · ${t.filesSkipped} skipped`,
  ];
}

export function coverageConfidence(view: PrView): { value: string; note: string } | null {
  const c = view.confidence;
  if (!c) return null;
  const level = c.lowest === c.highest ? c.lowest : `${c.lowest}–${c.highest}`;
  return {
    value: `${c.score.toFixed(2)} · ${level}`,
    note: "Average of the regions' derived confidence, never the model's self-assessment.",
  };
}
