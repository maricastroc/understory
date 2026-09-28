import type { DiffResult } from "@git-investigator/core/diff/types";
import type { Artifact, Entailment, Evidence } from "@git-investigator/core/types";
import { prMetrics } from "../../diff/pr-metrics";
import { quotesFromChecks } from "../../line-investigation/model/audit-claims";
import { deriveArtifacts } from "../../line-investigation/model/derive-artifacts";
import { byDepth } from "../../line-investigation/model/depth-order";
import { letterAt } from "../../line-investigation/model/letter-sequence";
import type {
  ClaimAudit,
  TallyCell,
  ViewArtifact,
  ViewClause,
  ViewGap,
  ViewQuote,
} from "../../line-investigation/model/types";
import { coverageItems } from "./coverage-items";
import { deriveRegions } from "./derive-regions";
import type { DerivedConfidence, PrClause, PrRegion, PrView } from "./types";

const LEVEL_RANK = { low: 0, medium: 1, high: 2 } as const;

function auditOf(e: Entailment | undefined, claim?: number): ClaimAudit {
  if (!e?.checked) return "unaudited";
  const checks = claim === undefined ? e.checks : e.checks.filter((c) => c.claim === claim);
  if (checks.length === 0) return "unaudited";
  if (checks.some((c) => c.status === "unsupported")) return "unsupported";
  if (checks.some((c) => c.status === "weak")) return "weak";
  return "supported";
}

function cellState(audit: ClaimAudit, verified: boolean): TallyCell["state"] {
  if (verified) return "verified";
  if (audit === "weak") return "weak";
  if (audit === "unsupported") return "misattributed";
  if (audit === "unaudited") return "unaudited";
  return "cited";
}

function clause(
  spec: {
    id: string;
    index: number;
    text: string;
    citations: string[];
    silent: boolean;
    grounded: boolean;
    audit: ClaimAudit;
  },
  known: Set<string>,
  letters: Map<string, string>,
  quotes: Map<string, ViewQuote[]>,
): ViewClause {
  const cited = [...new Set(spec.citations)];
  const citations = cited.filter((c) => known.has(c));
  const unknownCitations = cited.filter((c) => !known.has(c));
  const cells: TallyCell[] = [
    ...citations.map((c) => ({
      citation: c,
      letter: letters.get(c) ?? null,
      state: cellState(
        spec.audit,
        (quotes.get(c) ?? []).some((q) => (q.clauseId ?? "").split("|").includes(spec.id)),
      ),
    })),
    ...unknownCitations.map((c) => ({ citation: c, letter: null, state: "unknown" as const })),
  ];
  return {
    id: spec.id,
    index: spec.index,
    text: spec.text,
    silent: spec.silent,
    legacy: false,
    grounded: spec.grounded,
    audit: spec.audit,
    citations,
    letters: citations.map((c) => letters.get(c)!).filter(Boolean),
    unknownCitations,
    cells,
  };
}

function silentClauseText(ids: string[], all: boolean): string {
  if (all) return "Why these regions exist is not recorded";
  if (ids.length === 1) return `Why ${ids[0]} exists is not recorded`;
  return `Why ${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]} exist is not recorded`;
}

function reasonGaps(regions: PrRegion[], artifacts: ViewArtifact[]): ViewGap[] {
  return regions
    .filter((r) => r.state === "silent")
    .flatMap((r) => {
      const own = artifacts.filter((a) => r.artifactIds.includes(a.id));
      const deepest = [...own].reverse().find((a) => a.daysBeforeNow !== null) ?? own.at(-1);
      if (!deepest) return [];
      const direct =
        !own.some((a) => a.kind === "pull_request") &&
        own.filter((a) => a.kind === "commit").every((a) => a.prLookup === "none");
      return [
        {
          id: `gap:${r.key}`,
          missing: direct ? ("pull_request" as const) : ("reason" as const),
          afterId: deepest.id,
          verified: true,
          basis: direct ? ("searched" as const) : ("silent" as const),
        },
      ];
    });
}

function derivedConfidence(result: DiffResult, regions: PrRegion[]): DerivedConfidence | null {
  const weights = result.findings.map(
    (_, i) => regions.filter((r) => r.findings.includes(i)).length,
  );
  const recorded = result.findings
    .map((f, i) => ({ f, w: weights[i] }))
    .filter(({ f, w }) => f.recorded && w > 0);
  if (recorded.length === 0) return null;
  const total = recorded.reduce((s, { w }) => s + w, 0);
  const levels = recorded.map(({ f }) => f.confidence.level);
  const rank = (l: (typeof levels)[number]) => LEVEL_RANK[l];
  return {
    score: recorded.reduce((s, { f, w }) => s + f.confidence.score * w, 0) / total,
    lowest: levels.reduce((a, b) => (rank(a) <= rank(b) ? a : b)),
    highest: levels.reduce((a, b) => (rank(a) >= rank(b) ? a : b)),
  };
}

export function buildPrView(result: DiffResult, opts: { now: Date | number }): PrView {
  const now = typeof opts.now === "number" ? opts.now : opts.now.getTime();
  const opened = result.pr.createdAt ? Date.parse(result.pr.createdAt) : Number.NaN;
  const datum = Number.isNaN(opened)
    ? { time: now, label: "today" as const }
    : { time: opened, label: "head" as const };
  const evidenceOnly = !!result.error;

  const regions = deriveRegions(result);
  const union = new Map<string, Artifact>();
  for (const f of result.findings)
    for (const a of f.artifacts) if (!union.has(a.id)) union.set(a.id, a);
  const ordered = [...union.values()].sort(byDepth);
  const letters = new Map(ordered.map((a, i) => [a.id, letterAt(i)]));
  const known = new Set(union.keys());

  const quotes = new Map<string, ViewQuote[]>();
  result.findings.forEach((f, i) => {
    if (f.entailment?.checked) quotesFromChecks(f.entailment.checks, union, () => `f${i}`, quotes);
  });
  if (result.summaryEntailment?.checked) {
    quotesFromChecks(
      result.summaryEntailment.checks,
      union,
      (c) => (c.claim !== undefined ? `c${c.claim}` : null),
      quotes,
    );
  }

  for (const [id, list] of quotes) {
    const merged = new Map<string, ViewQuote>();
    for (const q of list) {
      const prev = merged.get(q.text);
      merged.set(
        q.text,
        prev ? { ...prev, clauseId: [prev.clauseId, q.clauseId].filter(Boolean).join("|") } : q,
      );
    }
    quotes.set(id, [...merged.values()]);
  }

  const findingClauses = result.findings.map((f, i) =>
    clause(
      {
        id: `f${i}`,
        index: i,
        text: [f.why, f.connection].filter(Boolean).join(" "),
        citations: [...f.citations, ...f.unknownCitations],
        silent: !f.recorded,
        grounded: f.grounded,
        audit: auditOf(f.entailment),
      },
      known,
      letters,
      quotes,
    ),
  );

  const summary: PrClause[] = evidenceOnly
    ? []
    : result.summaryClaims.map((c, i) => {
        const base = clause(
          {
            id: `c${i}`,
            index: i,
            text: c.text,
            citations: c.citations,
            silent: false,
            grounded: c.grounded,
            audit: auditOf(result.summaryEntailment, i),
          },
          known,
          letters,
          quotes,
        );
        const regionIds = regions
          .filter((r) => base.citations.some((id) => r.artifactIds.includes(id)))
          .map((r) => r.id);
        return { ...base, regions: regionIds, derived: false };
      });

  const silentIds = regions.filter((r) => r.state === "silent").map((r) => r.id);
  const uncovered = silentIds.filter((id) => !summary.some((c) => c.regions.includes(id)));
  const clauses: PrClause[] =
    evidenceOnly || uncovered.length === 0
      ? summary
      : [
          ...summary,
          {
            id: "silent",
            index: summary.length,
            text: silentClauseText(uncovered, silentIds.length === regions.length),
            silent: true,
            legacy: false,
            grounded: true,
            audit: "unaudited",
            citations: [],
            letters: [],
            unknownCitations: [],
            cells: [],
            regions: uncovered,
            derived: true,
          },
        ];

  const evidence = {
    question: "",
    repo: result.repo,
    artifacts: ordered,
    contradictions: [],
  } satisfies Evidence;
  const artifacts = deriveArtifacts(
    evidence,
    ordered,
    letters,
    [...clauses, ...findingClauses],
    quotes,
    datum.time,
  );
  const gaps = evidenceOnly ? [] : reasonGaps(regions, artifacts);

  const regionsOf = new Map<string, string[]>();
  for (const a of artifacts) {
    regionsOf.set(
      a.id,
      regions.filter((r) => r.artifactIds.includes(a.id)).map((r) => r.id),
    );
  }
  for (const g of gaps) {
    const region = regions.find((r) => `gap:${r.key}` === g.id);
    if (region) regionsOf.set(g.id, [region.id]);
  }

  const withHunks = regions.every((r) => r.hunk !== null);
  return {
    mode: evidenceOnly ? "evidence-only" : "synthesized",
    repo: result.repo,
    pr: result.pr,
    datum,
    regions,
    artifacts,
    gaps,
    clauses,
    findingClauses,
    regionsOf,
    explained: regions.filter((r) => r.state === "explained").length,
    files: new Set(regions.map((r) => r.path)).size,
    added: withHunks ? regions.reduce((s, r) => s + (r.hunk?.added ?? 0), 0) : null,
    removed: withHunks ? regions.reduce((s, r) => s + (r.hunk?.removed ?? 0), 0) : null,
    upstream: (({ originCommits, pullRequests, issues, reviews }) => ({
      commits: originCommits,
      prs: pullRequests,
      issues,
      reviews,
    }))(prMetrics(result)),
    coverage: coverageItems(result, regions, gaps, quotes),
    confidence: evidenceOnly ? null : derivedConfidence(result, regions),
    triage: result.triage,
    error: result.error ?? null,
  };
}
