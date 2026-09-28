import { SPECIMEN } from "./specimen-metrics";

const TOP = SPECIMEN.border + SPECIMEN.headerHeight + SPECIMEN.padTop;

export function datumYFor(rowsAboveDatum: number, datumRows = 1): number {
  return TOP + (rowsAboveDatum + datumRows) * SPECIMEN.rowHeight;
}

export function rowsAboveFor(targetDatumY: number, datumRows = 1): number {
  return Math.max(0, Math.ceil((targetDatumY - TOP) / SPECIMEN.rowHeight - datumRows));
}
