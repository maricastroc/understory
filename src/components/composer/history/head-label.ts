import type { HeadCommit } from "@understory/core/types";
import { formatDayMonth } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

export function headLabel(
  head: HeadCommit,
  locale: Locale,
): { sha: string; day: string; year: string } {
  const { dayMonth, year } = formatDayMonth(messagesFor(locale).time, head.date);
  return { sha: head.sha.slice(0, 7), day: dayMonth, year };
}
