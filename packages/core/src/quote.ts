import type { QuoteRange } from "./types";

const QUOTE_MIN = 8;

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

export function verifyQuote(body: string, quote: string): string | null {
  const q = quote.trim();
  if (q.length < QUOTE_MIN) return null;
  return normalize(body).includes(normalize(q)) ? q : null;
}

function normalizeWithMap(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let pendingSpace = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (text.length > 0 && pendingSpace < 0) pendingSpace = i;
      continue;
    }
    if (pendingSpace >= 0) {
      text += " ";
      map.push(pendingSpace);
      pendingSpace = -1;
    }
    for (const unit of ch.toLowerCase()) {
      text += unit;
      map.push(i);
    }
  }
  return { text, map };
}

export function locateQuote(body: string, quote: string): QuoteRange | null {
  if (!verifyQuote(body, quote)) return null;
  const needle = normalize(quote);
  const hay = normalizeWithMap(body);
  const at = hay.text.indexOf(needle);
  if (at < 0) return null;
  const start = hay.map[at];
  const end = hay.map[at + needle.length - 1] + 1;
  return { start, end };
}
