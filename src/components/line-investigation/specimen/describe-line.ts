import { longAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { BlameBarModel } from "./types";

export function describeLine(
  line: number,
  datum: boolean,
  bar: BlameBarModel | undefined,
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const c = m.caseScreen;
  const parts = [c.lineAria(line)];
  if (datum) parts.push(c.investigatedLine);
  if (bar) parts.push(c.lastChangedBy(bar.shortSha, longAge(m.time, bar.ageDays)));
  return `${parts.join(", ")}.`;
}
