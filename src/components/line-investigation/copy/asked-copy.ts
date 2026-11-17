import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

export function askedText(token: string | null, line: number, locale: Locale): string {
  const c = messagesFor(locale).caseScreen;
  return token ? c.askedToken(token, line) : c.askedLine(line);
}
