import type { CodeContext, CodeLocation, LineChange } from "../types";

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

const SAME_LINE = 0.6;

function likeness(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  let row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const next = [0];
    for (let j = 1; j <= b.length; j++)
      next[j] = a[i - 1] === b[j - 1] ? row[j - 1] + 1 : Math.max(row[j], next[j - 1]);
    row = next;
  }
  return (2 * row[b.length]) / (a.length + b.length);
}

const isAdded = (row: string) => row.startsWith("+") && !row.startsWith("+++");
const isRemoved = (row: string) => row.startsWith("-") && !row.startsWith("---");

const MAX_BLOCK_ROWS = 40;
const BLOCK_HEAD_ROWS = 10;
const BLOCK_ROW_CHARS = 160;

const skipped = (count: number) => `… ${count} more ${count === 1 ? "line" : "lines"} …`;
const changedSince = (count: number) =>
  `… ${count} ${count === 1 ? "line" : "lines"} changed since …`;

function standingRows(
  rows: string[],
  at: number,
  today: Set<string> | null,
): { rows: string[]; at: number } {
  const kept: string[] = [];
  let mark = 0;
  let gone = 0;
  rows.forEach((row, i) => {
    if (!isAdded(row)) return;
    const text = row.slice(1);
    if (i !== at && today && !today.has(text.trim())) {
      gone++;
      return;
    }
    if (gone) kept.push(changedSince(gone));
    gone = 0;
    if (i === at) mark = kept.length;
    kept.push(text.length > BLOCK_ROW_CHARS ? `${text.slice(0, BLOCK_ROW_CHARS)}…` : text);
  });
  if (gone) kept.push(changedSince(gone));
  return { rows: kept, at: mark };
}

function changedBlock(rows: string[], hit: number, today: Set<string> | null): LineChange["block"] {
  const { rows: standing, at } = standingRows(rows, hit, today);
  if (standing.length < 3) return undefined;
  if (standing.length <= MAX_BLOCK_ROWS) return { rows: standing, at };
  const around = Math.floor((MAX_BLOCK_ROWS - BLOCK_HEAD_ROWS) / 2);
  const from = Math.max(BLOCK_HEAD_ROWS, at - around);
  const to = Math.min(standing.length, Math.max(at + around + 1, from + 2 * around));
  const kept =
    from > BLOCK_HEAD_ROWS ? standing.slice(0, BLOCK_HEAD_ROWS) : standing.slice(0, from);
  const gap = from > BLOCK_HEAD_ROWS ? [skipped(from - BLOCK_HEAD_ROWS)] : [];
  const tail = to < standing.length ? [skipped(standing.length - to)] : [];
  return {
    rows: [...kept, ...gap, ...standing.slice(from, to), ...tail],
    at: kept.length + gap.length + (at - from),
  };
}

export function lineChange(
  patch: string,
  line: string,
  today?: string,
): Omit<LineChange, "artifactId"> | null {
  const wanted = line.trim();
  if (!wanted) return null;
  const rows = patch.replace(/\r\n/g, "\n").split("\n");
  const cut = wanted.endsWith("…") ? wanted.slice(0, -1).trimEnd() : null;
  const same = (text: string) => (cut ? text.trim().startsWith(cut) : text.trim() === wanted);
  const hits = rows.flatMap((row, i) => (isAdded(row) && same(row.slice(1)) ? [i] : []));
  if (hits.length !== 1) return null;
  let from = hits[0];
  while (from > 0 && (isAdded(rows[from - 1]) || isRemoved(rows[from - 1]))) from--;
  let to = hits[0];
  while (to < rows.length - 1 && (isAdded(rows[to + 1]) || isRemoved(rows[to + 1]))) to++;
  const block = rows.slice(from, to + 1);
  const added = block.filter(isAdded).map((row) => row.slice(1));
  const removed = block.filter(isRemoved).map((row) => row.slice(1));
  const alike = removed
    .map((row, at) => ({ row, at, score: likeness(row.trim(), wanted) }))
    .filter((candidate) => candidate.score >= SAME_LINE);
  const paired =
    removed.length === 1 && added.length === 1
      ? removed[0]
      : (
          (removed.length === added.length && alike.find((c) => c.at === added.findIndex(same))) ||
          alike.sort((x, y) => y.score - x.score)[0]
        )?.row;
  const standing =
    today === undefined
      ? null
      : new Set(
          today
            .replace(/\r\n/g, "\n")
            .split("\n")
            .map((text) => text.trim()),
        );
  const shown = changedBlock(block, hits[0] - from, standing);
  return {
    before: paired === undefined ? null : clamp(paired.trim()),
    added: added.length,
    ...(shown ? { block: shown } : {}),
  };
}

export function renderBlock(change: LineChange): string[] {
  if (!change.block) return [];
  const { rows, at } = change.block;
  return [
    `The lines [${change.artifactId}] added around the marked line that still read the same today (the marked line is flagged with >):`,
    ...rows.map((row, i) => `${i === at ? ">" : " "} ${row}`),
  ];
}

function renderChange(change: LineChange, line: string): string[] {
  const lead = `What the last change did to the marked line: [${change.artifactId}]`;
  if (change.before === null) {
    const others = change.added - 1;
    const company =
      others > 0
        ? `, together with ${others} other new ${others === 1 ? "line" : "lines"} around it`
        : "";
    return [`${lead} added it${company}.`];
  }
  if (change.before === line.trim()) return [`${lead} changed only its spacing.`];
  return [`${lead} rewrote it. Before, it read:`, `    ${change.before}`];
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
    ...(one && code.change
      ? renderChange(code.change, code.lines[location.startLine - code.startLine] ?? "")
      : []),
  ].join("\n");
}
