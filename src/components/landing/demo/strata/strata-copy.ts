import { formatDayMonth, formatDecimal, shortAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { dayDate, tickText } from "../../../line-investigation/copy/artifact-copy";
import { tallyText } from "../../../line-investigation/copy/clause-copy";
import type { InvestigationView, ViewClause } from "../../../line-investigation/model/types";
import type { Stratum } from "./types";

const demo = (locale: Locale) => messagesFor(locale).landing.demo;

export function summaryText(view: InvestigationView, locale: Locale): string {
  const s = demo(locale).summary;
  const silences = view.gaps.filter((g) => g.verified).length;
  return [
    s.artifacts(view.artifacts.length),
    s.clauses(view.clauses.length),
    ...(silences ? [s.silences(silences)] : []),
  ].join(" · ");
}

export function askedText(token: string | null, line: number, locale: Locale): string {
  const d = demo(locale);
  return token ? d.askedToken(token, line) : d.askedLine(line);
}

export function currentCaption(line: number, locale: Locale): string {
  return demo(locale).current(line);
}

export function marginDate(s: Stratum, locale: Locale): { date: string; depth: string | null } {
  if (s.layer === "sub")
    return {
      date: formatDayMonth(messagesFor(locale).time, s.artifact.date).dayMonth,
      depth: null,
    };
  const days = s.artifact.daysBeforeNow;
  return {
    date: dayDate(s.artifact.date, locale),
    depth: days === null ? null : tickText(days, locale),
  };
}

export function unchangedText(days: number, locale: Locale): string {
  const m = messagesFor(locale);
  return m.subject.unchangedFor(shortAge(m.time, days));
}

export function silenceTitle(isOrigin: boolean, locale: Locale): string {
  const d = demo(locale);
  return isOrigin ? d.originSilent : d.recordSilent;
}

export function originText(line: number, days: number | null, locale: Locale): string | null {
  return days === null ? null : demo(locale).origin(line, formatDecimal(locale, days / 365.25, 1));
}

export function strataTally(clause: ViewClause, locale: Locale): string {
  if (clause.silent || clause.audit !== "supported") return tallyText(clause, locale);
  const verified = clause.cells.filter((c) => c.state === "verified").length;
  const known = clause.cells.filter((c) => c.state !== "unknown").length;
  return demo(locale).tally(known, verified);
}
