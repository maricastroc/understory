import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ViewArtifact, ViewClause } from "../model/types";
import { displayId, kindName } from "./artifact-copy";

export function tallyText(clause: ViewClause, locale: Locale): string {
  const c = messagesFor(locale).clause;
  if (clause.silent) return c.noReason;
  const known = clause.cells.filter((cell) => cell.state !== "unknown").length;
  const unknown = clause.cells.length - known;
  const parts = [c.sources(known)];
  const verified = clause.cells.filter((cell) => cell.state === "verified").length;
  if (clause.audit === "supported") parts.push(c.verified(verified));
  if (clause.audit === "weak") parts.push(c.weak);
  if (clause.audit === "unsupported") parts.push(c.unsupported);
  if (clause.audit === "unaudited") parts.push(c.unaudited);
  if (unknown > 0) parts.push(c.notCollected(unknown));
  return parts.join(" · ");
}

export function clauseDescription(
  clause: ViewClause,
  byId: Map<string, ViewArtifact>,
  locale: Locale,
): string {
  const c = messagesFor(locale).clause;
  if (clause.silent) return c.silent;
  const sources = clause.citations
    .map((id) => byId.get(id))
    .filter((a): a is ViewArtifact => !!a)
    .map((a) => c.source(a.letter, kindName(a.kind, locale), displayId(a)));
  const parts = [sources.length ? c.supportedBy(sources.join("; ")) : c.noSource];
  const verified = clause.cells.filter((cell) => cell.state === "verified").length;
  if (clause.audit === "supported") parts.push(verified ? c.quotesVerified(verified) : c.noQuote);
  if (clause.audit === "weak") parts.push(c.weakDescription);
  if (clause.audit === "unsupported") parts.push(c.unsupportedDescription);
  if (clause.audit === "unaudited") parts.push(c.unauditedDescription);
  if (clause.unknownCitations.length)
    parts.push(c.neverCollected(clause.unknownCitations.join(", ")));
  return parts.join(" ");
}
