import type { FileHistory, HeadCommit, PrLookup } from "@git-investigator/core/types";
import { MAP } from "./map-geometry";
import type { CoreHistory, DepthScale, MarkTone } from "./types";

const DAY = 86_400_000;
const MIN_DEPTH = 120;
const MAX_DEPTH = 360;
const PER_COMMIT = 24;
const OUTLIER = 6;
const KNEE = 1.2;
const TAIL = 48;
const BREAK_GAP = 14;
const MAX_TICKS = 5;
const MIN_TICK_GAP = 28;
const SLACK = 0.5;

const UNITS = [
  { days: 1, suffix: "d", steps: [1, 2, 5], below: 14 },
  { days: 7, suffix: "w", steps: [1, 2, 4], below: 61 },
  { days: 365.25 / 12, suffix: "m", steps: [1, 2, 3, 6], below: 548 },
  { days: 365.25, suffix: "y", steps: [1, 2, 5, 10, 20, 50], below: Infinity },
];

type Tick = DepthScale["ticks"][number];

export function ageDays(head: HeadCommit, at: string): number {
  const days = (Date.parse(head.date) - Date.parse(at)) / DAY;
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

function unitFor(days: number) {
  return UNITS.find((u) => days < u.below) ?? UNITS[UNITS.length - 1];
}

function ticksFor(maxDays: number, pxPerDay: number, offset: (days: number) => number): Tick[] {
  const unit = unitFor(maxDays);
  const step =
    unit.steps.find(
      (s) =>
        Math.floor((maxDays + SLACK) / (unit.days * s)) <= MAX_TICKS &&
        unit.days * s * pxPerDay >= MIN_TICK_GAP,
    ) ?? unit.steps[unit.steps.length - 1];
  const ticks: Tick[] = [];
  for (let n = step; n * unit.days <= maxDays + SLACK; n += step) {
    ticks.push({ offset: offset(n * unit.days), label: `−${n}${unit.suffix}` });
  }
  return ticks;
}

export function depthScale(histories: FileHistory[], head: HeadCommit): DepthScale {
  const oldest = histories
    .map((h) => h.marks.reduce((a, m) => Math.max(a, ageDays(head, m.at)), 0))
    .sort((a, b) => b - a);
  const maxDays = oldest[0] ?? 0;
  if (maxDays <= 0) return { depth: 0, offset: () => 0, ticks: [], breakAt: null };
  const commits = histories.reduce((a, h) => Math.max(a, h.marks.length), 0);
  const near = Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, commits * PER_COMMIT));
  const second = oldest[1] ?? 0;
  if (second <= 0 || maxDays <= OUTLIER * second) {
    const offset = (days: number) => (days / maxDays) * near;
    return { depth: near, offset, ticks: ticksFor(maxDays, near / maxDays, offset), breakAt: null };
  }
  const knee = second * KNEE;
  const offset = (days: number) =>
    days <= knee
      ? (days / knee) * near
      : near + BREAK_GAP + ((days - knee) / (maxDays - knee)) * (TAIL - BREAK_GAP);
  const unit = unitFor(maxDays);
  const whole = Math.floor((maxDays + SLACK) / unit.days);
  const end =
    whole * unit.days > knee
      ? [{ offset: offset(whole * unit.days), label: `−${whole}${unit.suffix}` }]
      : [];
  return {
    depth: near + TAIL,
    offset,
    ticks: [...ticksFor(knee, near / knee, offset), ...end],
    breakAt: near + BREAK_GAP / 2,
  };
}

export function markTone(lookup: PrLookup): MarkTone {
  if (lookup === "found") return "found";
  if (lookup === "none") return "none";
  return "unknown";
}

export function markWidth(lines: number, lineCount: number): number {
  return Math.round(8 + Math.min(1, lines / Math.max(1, lineCount)) * 32);
}

export function coreHistory(
  h: FileHistory,
  head: HeadCommit,
  scale: DepthScale,
  datumY: number = MAP.datumY,
): CoreHistory {
  const shares = { found: 0, none: 0, unknown: 0 };
  let oldestDays = 0;
  const marks = h.marks.map((m) => {
    const days = ageDays(head, m.at);
    oldestDays = Math.max(oldestDays, days);
    const tone = markTone(m.prLookup);
    shares[tone] += m.lines;
    return {
      sha: m.sha,
      y: datumY + scale.offset(days),
      width: markWidth(m.lines, h.lineCount),
      tone,
      lines: m.lines,
    };
  });
  const reach = scale.offset(oldestDays);
  return {
    bottom: datumY + reach,
    breakY: scale.breakAt !== null && reach > scale.breakAt ? datumY + scale.breakAt : null,
    marks,
    cut: h.cut,
    oldestDays,
    commits: h.marks.length,
    lines: h.lineCount,
    shares,
  };
}
