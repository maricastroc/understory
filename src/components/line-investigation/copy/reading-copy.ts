import type { Reading } from "@understory/core/types";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ChangeFact, PassageScope } from "../history/reading-layer";

export function factText(fact: ChangeFact, locale: Locale): string {
  const r = messagesFor(locale).reading;
  if (fact.did === "added") return r.added;
  if (fact.did === "respaced") return r.respaced;
  return r.rewrote;
}

export function placeText(
  placement: NonNullable<PassageScope["placement"]>,
  locale: Locale,
  outdated?: boolean,
): string {
  const r = messagesFor(locale).reading;
  const place = r.place[placement];
  return outdated && placement !== "another file" ? r.onEarlierVersion(place) : place;
}

export function scopeText(scope: PassageScope, locale: Locale): string {
  const place = scope.placement ? placeText(scope.placement, locale, scope.outdated) : null;
  return [messagesFor(locale).reading.scope[scope.scope], place].filter(Boolean).join(" · ");
}

export function earlierCaption(locale: Locale): string {
  return messagesFor(locale).reading.earlierCaption;
}

export function edgeText(
  edge: Reading["earlier"],
  history: Reading["history"],
  locale: Locale,
): string | null {
  const r = messagesFor(locale).reading;
  if (history === "the file") return r.fileOnly;
  if (edge === null) return null;
  if (edge === "not read") return r.notRead;
  return edge === "the line was added" ? null : r.notReadBecause(r.why[edge]);
}
