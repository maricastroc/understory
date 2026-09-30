export type StrataMetrics = {
  mode: "wide" | "stacked";
  code: { font: number; line: number };
  codeX: number;
  datumY: number;
  firstBreak: number;
  gapBreak: number;
  main: { pad: number; row: number; bottom: number };
  sub: { pad: number; row: number; bottom: number };
  date: number;
  caption: number;
  quote: number;
  version: number;
  absent: number;
  timePad: { pxPerDay: number; max: number };
  silent: { pxPerDay: number; min: number; max: number; pad: number };
  clause: number;
  tail: number;
};
