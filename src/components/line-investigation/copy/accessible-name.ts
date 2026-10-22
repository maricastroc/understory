import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ViewArtifact, ViewClause, ViewGap } from "../model/types";
import { dateLine, displayId, kindName } from "./artifact-copy";

function clauseList(ids: string[], clauses: ViewClause[], locale: Locale): string {
  const a = messagesFor(locale).accessible;
  const numbers = clauses.filter((c) => ids.includes(c.id)).map((c) => c.index + 1);
  if (numbers.length === 0) return a.notCited;
  if (numbers.length === 1) return a.citedBy(String(numbers[0]));
  return a.citedByMany(numbers.slice(0, -1).join(", "), String(numbers[numbers.length - 1]));
}

export function artifactName(a: ViewArtifact, clauses: ViewClause[], locale: Locale): string {
  const parts = [
    a.letter,
    `${kindName(a.kind, locale)} ${displayId(a)}`,
    dateLine(a, locale),
    clauseList(a.citedBy, clauses, locale),
  ];
  if (a.verified) parts.push(messagesFor(locale).accessible.quoteVerified);
  return parts.join(", ");
}

export function gapName(gap: ViewGap, after: ViewArtifact, locale: Locale): string {
  const a = messagesFor(locale).accessible;
  const target = `${kindName(after.kind, locale)} ${displayId(after)}`;
  const text =
    gap.missing === "pull_request"
      ? a.noPrBefore(target)
      : gap.missing === "review"
        ? a.noReviewOn(target)
        : a.noIssueOn(target);
  if (!gap.verified) return a.notVerified(text);
  return gap.missing === "issue" ? a.capitalized(text) : a.notRecorded(text);
}
