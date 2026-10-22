import { ageParts } from "@/components/line-investigation/format/age";
import type { Locale } from "./locales";
import type { Messages } from "./messages";

type Time = Messages["time"];
export type TimeUnit = keyof Time["unit"];

export function formatSeconds(locale: Locale, seconds: number): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "second",
    unitDisplay: "long",
  }).format(seconds);
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function shortAge(t: Time, days: number): string {
  const p = ageParts(days);
  if (p.years > 0)
    return p.months > 0 ? `${p.years}${t.unit.y} ${p.months}${t.unit.m}` : `${p.years}${t.unit.y}`;
  if (p.months > 0) return `${p.months}${t.unit.m}`;
  return `${p.days}${t.unit.d}`;
}

export function longAge(t: Time, days: number): string {
  const p = ageParts(days);
  if (p.years > 0)
    return p.months > 0 ? t.both(t.years(p.years), t.months(p.months)) : t.years(p.years);
  if (p.months > 0) return t.months(p.months);
  return p.days === 0 ? t.lessThanADay : t.days(p.days);
}

export function depthLabel(t: Time, count: number, unit: TimeUnit): string {
  return `−${count}${t.unit[unit]}`;
}

function dateParts(iso: string): { day: number; month: number; year: number } | null {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: m - 1, year: y };
}

export function formatDay(t: Time, iso: string): string {
  const p = dateParts(iso);
  return p ? t.date(p.day, t.monthNames[p.month] ?? String(p.month + 1), p.year) : iso;
}

export function formatDayMonth(t: Time, iso: string): { dayMonth: string; year: string } {
  const p = dateParts(iso);
  if (!p) return { dayMonth: iso, year: "" };
  return {
    dayMonth: t.dayMonth(p.day, t.monthNames[p.month] ?? String(p.month + 1)),
    year: String(p.year),
  };
}

export function formatPlainDay(t: Time, iso: string): string {
  const p = dateParts(iso);
  return p ? t.plainDate(p.day, t.monthNames[p.month] ?? String(p.month + 1), p.year) : iso;
}

export function formatDecimal(locale: Locale, value: number, digits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
