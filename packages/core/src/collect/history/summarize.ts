import type { HistoryMark } from "../../types";

export type SpanLike = {
  startLine: number;
  endLine: number;
  sha: string;
  date: string;
  boundary?: boolean;
};

export type BlameSummary = { lineCount: number; marks: HistoryMark[] };

export function summarizeSpans(spans: SpanLike[]): BlameSummary {
  const bySha = new Map<string, HistoryMark>();
  let lineCount = 0;
  for (const s of spans) {
    const lines = s.endLine - s.startLine + 1;
    if (lines <= 0) continue;
    lineCount += lines;
    const mark = bySha.get(s.sha);
    if (mark) {
      mark.lines += lines;
      mark.boundary ||= !!s.boundary;
    } else {
      bySha.set(s.sha, {
        sha: s.sha,
        at: s.date,
        lines,
        prLookup: "skipped",
        boundary: !!s.boundary,
      });
    }
  }
  const marks = [...bySha.values()].sort(
    (a, b) => b.at.localeCompare(a.at) || a.sha.localeCompare(b.sha),
  );
  return { lineCount, marks };
}

export function withLookups(
  summary: BlameSummary,
  lookups: ReadonlyMap<string, HistoryMark["prLookup"]>,
): BlameSummary {
  return {
    lineCount: summary.lineCount,
    marks: summary.marks.map((m) => {
      const next = lookups.get(m.sha);
      return next ? { ...m, prLookup: next } : m;
    }),
  };
}
