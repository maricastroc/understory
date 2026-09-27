import type { QuoteRange } from "@git-investigator/core/types";

export function withoutTitle(
  body: string,
  title: string,
  range: QuoteRange | null,
): { body: string; range: QuoteRange | null } {
  const trimmed = body.trimStart();
  const lead = body.length - trimmed.length;
  if (!title || !trimmed.startsWith(title)) return { body, range };
  const rest = trimmed.slice(title.length);
  const offset = lead + title.length + (rest.length - rest.trimStart().length);
  if (offset >= body.length || (range && range.start < offset)) return { body, range };
  return {
    body: body.slice(offset),
    range: range ? { start: range.start - offset, end: range.end - offset } : null,
  };
}
