import { locateQuote, verifyQuote } from "@git-investigator/core/quote";
import type { Artifact, CitationCheck, VerifiedNarrative } from "@git-investigator/core/types";
import { clauseId } from "./clause-id";
import type { ClaimAudit, ViewQuote } from "./types";

export function auditClaims(
  narrative: VerifiedNarrative | null,
  byId: Map<string, Artifact>,
): { audited: boolean; audits: Map<number, ClaimAudit>; quotes: Map<string, ViewQuote[]> } {
  const audited = narrative?.entailment?.checked === true;
  const checks = audited ? (narrative?.entailment?.checks ?? []) : [];
  const audits = new Map<number, ClaimAudit>();
  const quotes = new Map<string, ViewQuote[]>();

  for (const c of checks) if (c.claim !== undefined) audits.set(c.claim, c.status);
  quotesFromChecks(checks, byId, (c) => (c.claim !== undefined ? clauseId(c.claim) : null), quotes);

  return { audited, audits, quotes };
}

export function quotesFromChecks(
  checks: CitationCheck[],
  byId: Map<string, Artifact>,
  clauseOf: (check: CitationCheck) => string | null,
  into: Map<string, ViewQuote[]> = new Map(),
): Map<string, ViewQuote[]> {
  for (const c of checks) {
    if (c.status !== "supported" || !c.quote) continue;
    const body = byId.get(c.citation)?.body;
    if (body === undefined || !verifyQuote(body, c.quote)) continue;
    const list = into.get(c.citation) ?? [];
    list.push({ clauseId: clauseOf(c), text: c.quote, range: locateQuote(body, c.quote) });
    into.set(c.citation, list);
  }
  return into;
}
