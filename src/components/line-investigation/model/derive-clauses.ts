import type { VerifiedNarrative } from "@git-investigator/core/types";
import { clauseId } from "./clause-id";
import type { ClaimAudit, TallyState, ViewClause, ViewQuote } from "./types";

function cellState(known: boolean, audit: ClaimAudit, quoted: boolean): TallyState {
  if (!known) return "unknown";
  if (audit === "supported") return quoted ? "verified" : "cited";
  if (audit === "weak") return "weak";
  if (audit === "unsupported") return "misattributed";
  return "unaudited";
}

function clauseFrom(
  index: number,
  text: string,
  citations: string[],
  grounded: boolean,
  legacy: boolean,
  letters: Map<string, string>,
  audits: Map<number, ClaimAudit>,
  quotes: Map<string, ViewQuote[]>,
): ViewClause {
  const id = clauseId(index);
  const unique = Array.from(new Set(citations));
  const audit = legacy ? "unaudited" : (audits.get(index) ?? "unaudited");
  return {
    id,
    index,
    text,
    silent: false,
    legacy,
    grounded,
    audit,
    citations: unique.filter((c) => letters.has(c)),
    letters: unique.flatMap((c) => letters.get(c) ?? []),
    unknownCitations: unique.filter((c) => !letters.has(c)),
    cells: unique.map((citation) => ({
      citation,
      letter: letters.get(citation) ?? null,
      state: cellState(
        letters.has(citation),
        audit,
        (quotes.get(citation) ?? []).some((q) => q.clauseId === id),
      ),
    })),
  };
}

export function deriveClauses(
  narrative: VerifiedNarrative | null,
  letters: Map<string, string>,
  audits: Map<number, ClaimAudit>,
  quotes: Map<string, ViewQuote[]>,
): ViewClause[] {
  if (!narrative || narrative.answerable === false) return [];

  if (!narrative.recorded) {
    return [
      {
        id: clauseId(0),
        index: 0,
        text: narrative.answer,
        silent: true,
        legacy: false,
        grounded: false,
        audit: "unaudited",
        citations: [],
        letters: [],
        unknownCitations: [],
        cells: [],
      },
    ];
  }

  if (!Array.isArray(narrative.claims)) {
    if (!narrative.answer) return [];
    return [
      clauseFrom(
        0,
        narrative.answer,
        narrative.citations ?? [],
        narrative.grounded,
        true,
        letters,
        audits,
        quotes,
      ),
    ];
  }

  return narrative.claims.map((c, i) =>
    clauseFrom(i, c.text, c.citations, c.grounded, false, letters, audits, quotes),
  );
}
