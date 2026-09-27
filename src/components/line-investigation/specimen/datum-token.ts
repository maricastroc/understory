import type { LineRange } from "./types";

const BACKTICKED = /`([^`]+)`/g;
const NUMBER = /(?<![\w.$])\d+(?:\.\d+)?(?![\w$]|\.\d)/g;
const IDENTIFIER =
  /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|\b[a-z]+[A-Z][\w$]*|\b[A-Za-z]*_[\w$]*|\b[A-Z][A-Z0-9_]{2,}\b/g;

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidates(question: string): string[] {
  const out: Array<{ at: number; text: string }> = [];
  for (const m of question.matchAll(BACKTICKED)) out.push({ at: m.index, text: m[1].trim() });
  const bare = question.replace(BACKTICKED, (m) => " ".repeat(m.length));
  for (const re of [NUMBER, IDENTIFIER]) {
    for (const m of bare.matchAll(re)) out.push({ at: m.index, text: m[0] });
  }
  return out
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.at - b.at)
    .map((c) => c.text);
}

export function datumToken(question: string, line: string): LineRange | null {
  for (const text of candidates(question)) {
    const pattern = new RegExp(`(?<![\\w$.])${escape(text)}(?![\\w$]|\\.\\d)`);
    const m = pattern.exec(line);
    if (m) return { start: m.index, end: m.index + text.length };
  }
  return null;
}
