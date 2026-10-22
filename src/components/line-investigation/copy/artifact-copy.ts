import type { ArtifactKind } from "@understory/core/types";
import { formatDecimal, formatPlainDay, shortAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ViewArtifact } from "../model/types";

export function dayDate(iso: string, locale: Locale): string {
  return formatPlainDay(messagesFor(locale).time, iso);
}

export function kindName(kind: ArtifactKind, locale: Locale): string {
  return messagesFor(locale).artifact.kind[kind];
}

export function displayId(a: ViewArtifact): string {
  if (a.kind === "commit") return a.source.ref ?? a.id.replace(/^commit:/, "");
  if (a.kind === "review" && a.source.author?.name) return `review·${a.source.author.name}`;
  return a.id;
}

export function reviewStateLabel(state: string | null, locale: Locale): string | null {
  if (!state) return null;
  const known = messagesFor(locale).artifact.reviewState as Record<string, string>;
  return known[state] ?? state.toLowerCase().replace(/_/g, " ");
}

export function labelTitle(a: ViewArtifact, locale: Locale): string {
  return (a.kind === "review" ? reviewStateLabel(a.reviewState, locale) : null) ?? a.title;
}

function parts(iso: string): { year: string; month: string } {
  return { year: iso.slice(0, 4), month: iso.slice(5, 7) };
}

export function dateLine(a: ViewArtifact, locale: Locale): string {
  const m = messagesFor(locale);
  if (a.kind !== "pull_request") return dayDate(a.date, locale);
  if (!a.endDate) return m.artifact.opened(dayDate(a.date, locale));
  const merged = dayDate(a.endDate, locale);
  const [from, to] = [parts(a.date), parts(a.endDate)];
  const day = Number(a.date.slice(8, 10));
  const month = m.time.monthNames[Number(from.month) - 1] ?? from.month;
  if (from.year === to.year && from.month === to.month) return m.artifact.open(String(day), merged);
  if (from.year === to.year) return m.artifact.open(m.time.dayMonth(day, month), merged);
  return m.artifact.open(dayDate(a.date, locale), merged);
}

export function depthText(days: number | null, locale: Locale): string {
  const m = messagesFor(locale);
  return days === null ? m.artifact.undated : `−${shortAge(m.time, days)}`;
}

export function tickText(days: number, locale: Locale): string {
  const unit = messagesFor(locale).time.unit;
  const years = days / 365.25;
  if (years >= 1) return `−${formatDecimal(locale, years, 1)}${unit.y}`;
  if (days >= 30.44) return `−${Math.floor(days / 30.44)}${unit.m}`;
  return `−${Math.floor(days)}${unit.d}`;
}
