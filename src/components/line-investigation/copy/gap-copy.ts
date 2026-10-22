import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ViewArtifact, ViewGap } from "../model/types";
import { displayId } from "./artifact-copy";

export function gapLetter(gap: ViewGap): string {
  return gap.verified ? "∅" : "?";
}

export function gapChip(gap: ViewGap, locale: Locale): string {
  return `${gapLetter(gap)} ${messagesFor(locale).gap.chip[gap.missing]}`;
}

export function gapLabel(gap: ViewGap, locale: Locale): string {
  const g = messagesFor(locale).gap;
  if (!gap.verified) return g.notVerified;
  return gap.missing === "issue" ? g.noLinkedIssue : g.notRecorded;
}

export function gapKind(gap: ViewGap): string {
  return gap.verified ? "NOT RECOVERED" : "NOT VERIFIED";
}

export function gapTitle(gap: ViewGap, locale: Locale): string {
  return messagesFor(locale).gap.title[gap.missing];
}

export function gapId(gap: ViewGap, after: ViewArtifact): string {
  return gap.missing === "pull_request" ? `before ${displayId(after)}` : `on ${displayId(after)}`;
}

export function gapBasis(gap: ViewGap, locale: Locale): string {
  return messagesFor(locale).gap.basis[gap.basis];
}

export function gapBody(
  gap: ViewGap,
  after: ViewArtifact,
  locale: Locale,
  reading = false,
): string {
  const g = messagesFor(locale).gap;
  const id = displayId(after);
  if (!gap.verified) return g.unverifiedBody(id);
  if (gap.missing === "pull_request") return reading ? g.noPrReading(id) : g.noPr(id);
  if (gap.missing === "review") return g.noReview(id);
  return g.noIssue(id);
}

export function gapStatus(gap: ViewGap, locale: Locale): string {
  const g = messagesFor(locale).gap;
  return gap.verified ? g.silent : g.unconfirmed;
}
