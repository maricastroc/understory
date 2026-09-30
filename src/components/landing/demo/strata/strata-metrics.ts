import type { StrataMetrics } from "./types";

export const STRATA_FRAME = { width: 1600, height: 1000, footer: 60 } as const;
export const STRATA_BREAK_DAYS = 45;
export const STRATA_COLUMNS = { margin: 40, subRule: 180, clause: 1112, question: 1120 } as const;

export const STRATA_WIDE: StrataMetrics = {
  mode: "wide",
  code: { font: 28, line: 40 },
  codeX: 196,
  datumY: 146,
  firstBreak: 87,
  gapBreak: 56,
  main: { pad: 10, row: 22, bottom: 12 },
  sub: { pad: 8, row: 20, bottom: 6 },
  date: 0,
  caption: 19,
  quote: 24,
  version: 6,
  absent: 26,
  timePad: { pxPerDay: 2, max: 24 },
  silent: { pxPerDay: 0.28, min: 96, max: 200, pad: 12 },
  clause: 56,
  tail: 2,
};

export const STRATA_STACKED: StrataMetrics = {
  mode: "stacked",
  code: { font: 13, line: 22 },
  codeX: 36,
  datumY: 56,
  firstBreak: 56,
  gapBreak: 40,
  main: { pad: 10, row: 20, bottom: 10 },
  sub: { pad: 6, row: 18, bottom: 4 },
  date: 16,
  caption: 17,
  quote: 20,
  version: 4,
  absent: 18,
  timePad: { pxPerDay: 1, max: 12 },
  silent: { pxPerDay: 0.2, min: 128, max: 160, pad: 10 },
  clause: 0,
  tail: 2,
};
