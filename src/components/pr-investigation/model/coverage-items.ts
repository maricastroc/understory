import type { DiffResult } from "@git-investigator/core/diff/types";
import type { Contradiction } from "@git-investigator/core/types";
import type { ViewGap, ViewQuote } from "../../line-investigation/model/types";
import type { CoverageItem, PrRegion } from "./types";

export function coverageItems(
  result: DiffResult,
  regions: PrRegion[],
  gaps: ViewGap[],
  quotes: Map<string, ViewQuote[]>,
): CoverageItem[] {
  const out: CoverageItem[] = [];
  if (result.error) {
    out.push({ kind: "evidence-only", error: result.error });
  } else {
    out.push({
      kind: "regions",
      explained: regions.filter((r) => r.state === "explained").length,
      total: regions.length,
    });

    const silent = regions.filter((r) => r.state === "silent");
    if (silent.length > 0) {
      out.push({
        kind: "silent",
        regions: silent.map((r) => r.id),
        directCommits: silent.every(
          (r) => gaps.find((g) => g.id === `gap:${r.key}`)?.missing === "pull_request",
        ),
      });
    }

    for (const r of regions.filter((x) => x.state === "partial")) {
      const findings = r.findings.map((i) => result.findings[i]);
      out.push({
        kind: "partial",
        region: r.id,
        explained: findings.filter((f) => f.recorded && f.grounded).length,
        total: findings.length,
      });
    }

    const real = new Set(result.findings.flatMap((f) => f.artifacts.map((a) => a.id)));
    const cited = new Set<string>();
    const unknown = new Set<string>();
    for (const f of result.findings) {
      f.citations.forEach((c) => cited.add(c));
      f.unknownCitations.forEach((c) => unknown.add(c));
    }
    for (const c of result.summaryClaims) {
      for (const id of c.citations) (real.has(id) ? cited : unknown).add(id);
    }
    const misattributed =
      result.findings.reduce(
        (s, f) => s + (f.entailment?.checked ? f.entailment.misattributed : 0),
        0,
      ) + (result.summaryEntailment?.checked ? result.summaryEntailment.misattributed : 0);
    out.push({
      kind: "citations",
      resolved: cited.size,
      total: cited.size + unknown.size,
      unknown: [...unknown],
      misattributed,
    });

    const verified = new Set(
      [...quotes.entries()].flatMap(([id, qs]) => qs.map((q) => `${id}|${q.text}`)),
    );
    out.push({ kind: "quotes", verified: verified.size });

    const unaudited = regions
      .filter((r) =>
        r.findings.some(
          (i) => result.findings[i].recorded && !result.findings[i].entailment?.checked,
        ),
      )
      .map((r) => r.id);
    if (unaudited.length > 0) out.push({ kind: "audit-unavailable", regions: unaudited });

    const seen = new Set<string>();
    const contradictions: Contradiction[] = [];
    for (const c of result.findings.flatMap((f) => f.contradictions)) {
      const key = `${c.artifactId}|${c.kind}`;
      if (!cited.has(c.artifactId) || seen.has(key)) continue;
      seen.add(key);
      contradictions.push(c);
    }
    if (contradictions.length > 0) out.push({ kind: "contradictions", items: contradictions });
  }

  if (result.triage.truncated) {
    out.push({
      kind: "truncated",
      investigated: regions.length,
      blamed: result.triage.targetsBlamed,
    });
  }
  if (result.note) out.push({ kind: "note", note: result.note });
  return out;
}
