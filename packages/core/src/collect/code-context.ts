import type { CodeContext, CodeLocation } from "../types";

const CONTEXT_LINES = 3;
const MAX_TARGET_LINES = 30;
const MAX_LINE_CHARS = 200;

const clamp = (line: string): string =>
  line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line;

function targetEnd(location: CodeLocation): number {
  return Math.min(location.endLine, location.startLine + MAX_TARGET_LINES - 1);
}

export function codeWindow(source: string, location: CodeLocation): CodeContext | null {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (location.startLine < 1 || location.startLine > lines.length) return null;
  const from = Math.max(1, location.startLine - CONTEXT_LINES);
  const to = Math.min(lines.length, targetEnd(location) + CONTEXT_LINES);
  return { startLine: from, lines: lines.slice(from - 1, to).map(clamp) };
}

export function renderCode(code: CodeContext, location: CodeLocation): string {
  const end = targetEnd(location);
  const width = String(code.startLine + code.lines.length - 1).length;
  const listing = code.lines.map((text, i) => {
    const number = code.startLine + i;
    const mark = number >= location.startLine && number <= end ? ">" : " ";
    return `${mark} ${String(number).padStart(width)} | ${text}`;
  });
  const one = location.startLine === location.endLine;
  return [
    `The code at that location (${one ? "the line" : "the lines"} under investigation ${one ? "is" : "are"} marked with >):`,
    ...listing,
  ].join("\n");
}
