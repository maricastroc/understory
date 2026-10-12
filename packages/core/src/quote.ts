import type { QuoteRange } from "./types";

const QUOTE_MIN = 8;
const MARK = /["'`«»‘-‟′″]/;
const DASH = /[‐-―−]/;
const ELLIPSIS = "…";

function folded(ch: string): string {
  if (/\s/.test(ch) || MARK.test(ch)) return "";
  if (DASH.test(ch)) return "-";
  if (ch === ELLIPSIS) return "...";
  return ch.toLowerCase();
}

function comparable(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    for (const unit of folded(s[i])) {
      text += unit;
      map.push(i);
    }
  }
  return { text, map };
}

const readable = (s: string): string =>
  Array.from(s, (ch) => (MARK.test(ch) ? "" : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

export function verifyQuote(body: string, quote: string): string | null {
  const q = quote.trim();
  if (readable(q).length < QUOTE_MIN) return null;
  return comparable(body).text.includes(comparable(q).text) ? q : null;
}

export function locateQuote(body: string, quote: string): QuoteRange | null {
  const q = verifyQuote(body, quote);
  if (!q) return null;
  const needle = comparable(q).text;
  const hay = comparable(body);
  const at = hay.text.indexOf(needle);
  if (at < 0) return null;
  let start = hay.map[at];
  let end = hay.map[at + needle.length - 1] + 1;
  if (MARK.test(q[0]) && start > 0 && MARK.test(body[start - 1])) start -= 1;
  if (MARK.test(q[q.length - 1]) && end < body.length && MARK.test(body[end])) end += 1;
  return { start, end };
}

export function sourceQuote(body: string, quote: string): string | null {
  const range = locateQuote(body, quote);
  return range ? body.slice(range.start, range.end).replace(/\s+/g, " ").trim() : null;
}
