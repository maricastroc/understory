import { formatDecimal } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

const demo = (locale: Locale) => messagesFor(locale).landing.demo;

export function askedText(token: string | null, line: number, locale: Locale): string {
  const d = demo(locale);
  return token ? d.askedToken(token, line) : d.askedLine(line);
}

export function originText(line: number, days: number | null, locale: Locale): string | null {
  return days === null ? null : demo(locale).origin(line, formatDecimal(locale, days / 365.25, 1));
}
