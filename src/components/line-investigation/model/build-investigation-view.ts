import { narrativeLanguage } from "@understory/core/narrative-language";
import type { DigResult } from "@understory/core/types";
import { auditClaims } from "./audit-claims";
import { countLinks } from "./count-links";
import { deriveArtifacts } from "./derive-artifacts";
import { deriveChecklist } from "./derive-checklist";
import { deriveClauses } from "./derive-clauses";
import { deriveGaps } from "./derive-gaps";
import { deriveVerdict } from "./derive-verdict";
import { byDepth } from "./depth-order";
import { letterAt } from "./letter-sequence";
import type { InvestigationView } from "./types";

export function buildInvestigationView(
  result: DigResult,
  opts: { now: Date | number; pending?: boolean },
): InvestigationView {
  const ev = result.evidence;
  const narrative = result.narrative;
  const now = typeof opts.now === "number" ? opts.now : opts.now.getTime();

  const ordered = [...ev.artifacts].sort(byDepth);
  const letters = new Map(ordered.map((a, i) => [a.id, letterAt(i)]));
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));

  const { audited, audits, quotes } = auditClaims(narrative, byId);
  const clauses = deriveClauses(narrative, letters, audits, quotes);
  const artifacts = deriveArtifacts(ev, ordered, letters, clauses, quotes, now);
  const gaps = deriveGaps(ev, artifacts);

  return {
    verdict: deriveVerdict(result, opts.pending ?? false),
    question: ev.question,
    repo: ev.repo,
    location: ev.location ?? null,
    pinnedSha: ev.repo.sha ?? null,
    granularity: ev.coverage?.granularity === "file" ? "file" : "line",
    artifacts,
    clauses,
    gaps,
    empty: artifacts.length === 0 && gaps.length === 0,
    links: countLinks(ev, artifacts, gaps),
    checklist: deriveChecklist(result, clauses, audited, quotes),
    confidence: narrative?.confidence ?? null,
    answer: narrative?.answer ?? null,
    language: narrative ? narrativeLanguage(narrative) : null,
    error: result.error ?? null,
  };
}
