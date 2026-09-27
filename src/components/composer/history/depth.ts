import type { FileHistory, HeadCommit, PrLookup } from "@git-investigator/core/types";
import { MAP } from "./map-geometry";
import type { CoreHistory, DepthScale, MarkTone } from "./types";

const DAY = 86_400_000;
const YEAR = 365.25;
const MAX_PX_PER_YEAR = 78;
const MIN_PX_PER_YEAR = 24;
const DEPTH_BUDGET = 470;

export function ageDays(head: HeadCommit, at: string): number {
  const days = (Date.parse(head.date) - Date.parse(at)) / DAY;
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

export function depthScale(histories: FileHistory[], head: HeadCommit): DepthScale {
  let oldest = 0;
  for (const h of histories)
    for (const m of h.marks) oldest = Math.max(oldest, ageDays(head, m.at));
  const maxYears = oldest / YEAR;
  const pxPerYear = Math.max(
    MIN_PX_PER_YEAR,
    Math.min(MAX_PX_PER_YEAR, DEPTH_BUDGET / Math.max(1, maxYears)),
  );
  const step = pxPerYear >= 30 ? 1 : pxPerYear >= 14 ? 2 : 5;
  const ticks: number[] = [];
  for (let y = step; y <= Math.max(1, Math.ceil(maxYears)); y += step) ticks.push(y);
  return { pxPerYear, maxYears, ticks };
}

export function markTone(lookup: PrLookup): MarkTone {
  if (lookup === "found") return "found";
  if (lookup === "none") return "none";
  return "unknown";
}

export function markWidth(lines: number, lineCount: number): number {
  return Math.round(6 + Math.min(1, lines / Math.max(1, lineCount)) * 30);
}

export function coreHistory(h: FileHistory, head: HeadCommit, scale: DepthScale): CoreHistory {
  const shares = { found: 0, none: 0, unknown: 0 };
  let oldestDays = 0;
  const marks = h.marks.map((m) => {
    const days = ageDays(head, m.at);
    oldestDays = Math.max(oldestDays, days);
    const tone = markTone(m.prLookup);
    shares[tone] += m.lines;
    return {
      sha: m.sha,
      y: MAP.datumY + (days / YEAR) * scale.pxPerYear,
      width: markWidth(m.lines, h.lineCount),
      tone,
      lines: m.lines,
    };
  });
  return {
    bottom: MAP.datumY + (oldestDays / YEAR) * scale.pxPerYear,
    marks,
    cut: h.cut,
    oldestDays,
    commits: h.marks.length,
    lines: h.lineCount,
    shares,
  };
}
