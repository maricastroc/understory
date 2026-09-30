import { locateQuote, verifyQuote } from "@understory/core/quote";
import type { Artifact, VerifiedNarrative } from "@understory/core/types";
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

  for (const c of checks) {
    if (c.claim !== undefined) audits.set(c.claim, c.status);
    if (c.status !== "supported" || !c.quote) continue;
    const body = byId.get(c.citation)?.body;
    if (body === undefined || !verifyQuote(body, c.quote)) continue;
    const list = quotes.get(c.citation) ?? [];
    list.push({
      clauseId: c.claim !== undefined ? clauseId(c.claim) : null,
      text: c.quote,
      range: locateQuote(body, c.quote),
    });
    quotes.set(c.citation, list);
  }

  return { audited, audits, quotes };
}
