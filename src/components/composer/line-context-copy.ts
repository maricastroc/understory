import type { BlameSpan, HeadCommit } from "@understory/core/types";
import { formatDay, shortAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { ageDays } from "./history/depth";

export type LastChange = {
  sha: string;
  author: string | null;
  date: string;
  age: string | null;
  commits: number;
};

export function lastChange(
  spans: BlameSpan[],
  head: HeadCommit | null,
  locale: Locale,
): LastChange | null {
  if (!spans.length) return null;
  const t = messagesFor(locale).time;
  const newest = [...spans].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    sha: newest.shortSha,
    author: newest.author ?? null,
    date: formatDay(t, newest.date),
    age: head ? shortAge(t, ageDays(head, newest.date)) : null,
    commits: new Set(spans.map((s) => s.sha)).size,
  };
}
