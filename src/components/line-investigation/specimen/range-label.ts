import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { LineRange } from "./types";

export function rangeLabel(range: LineRange, symbol: string | null, locale: Locale): string {
  const m = messagesFor(locale);
  const lines = m.subject.lines(range.start, range.end);
  return symbol ? m.caseScreen.hiddenSymbol(lines, symbol) : m.caseScreen.hidden(lines);
}
