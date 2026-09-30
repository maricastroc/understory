import type { LineRange } from "../../../line-investigation/specimen/types";

const WORD = /[\w$.]/;

export function pastValue(text: string, token: LineRange): LineRange | null {
  const at = token.start;
  if (at >= text.length || /\s/.test(text[at])) return null;
  let [start, end] = [at, at + 1];
  if (WORD.test(text[at])) {
    while (start > 0 && WORD.test(text[start - 1])) start--;
    while (end < text.length && WORD.test(text[end])) end++;
  }
  return { start, end };
}
