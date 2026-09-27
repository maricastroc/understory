import type { LineRange } from "./line-range";

export type SpecimenWindow = {
  padRows: number;
  start: number;
  end: number;
  hiddenBefore: LineRange | null;
  hiddenAfter: LineRange | null;
  beforeRow: boolean;
  rowsAboveDatum: number;
  datumY: number;
};
