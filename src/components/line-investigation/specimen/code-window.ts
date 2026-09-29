import type { SymbolSpan } from "@understory/core/collect/symbol";
import { datumYFor, rowsAboveFor } from "./datum-y";
import { SPECIMEN } from "./specimen-metrics";
import type { LineRange, SpecimenMode, SpecimenWindow } from "./types";

type WindowInput = {
  lineCount: number;
  datum: LineRange;
  enclosing: SymbolSpan | null;
  mode: SpecimenMode;
  expanded: boolean;
  context?: number;
  targetDatumY?: number;
};

function range(start: number, end: number): LineRange | null {
  return end >= start ? { start, end } : null;
}

function finish(
  w: Omit<SpecimenWindow, "rowsAboveDatum" | "datumY">,
  datum: LineRange,
): SpecimenWindow {
  const rowsAboveDatum = w.padRows + (w.beforeRow ? 1 : 0) + (datum.start - w.start);
  return { ...w, rowsAboveDatum, datumY: datumYFor(rowsAboveDatum, datum.end - datum.start + 1) };
}

function panelWindow(input: WindowInput): SpecimenWindow {
  const { lineCount, datum, enclosing, expanded } = input;
  const datumRows = datum.end - datum.start + 1;
  const wanted = rowsAboveFor(input.targetDatumY ?? SPECIMEN.defaultDatumY, datumRows);
  const available = datum.start - 1;

  if (expanded) {
    return finish(
      {
        padRows: Math.max(0, wanted - available),
        start: 1,
        end: lineCount,
        hiddenBefore: null,
        hiddenAfter: null,
        beforeRow: false,
      },
      datum,
    );
  }

  const above = available > 0 ? Math.max(1, wanted) : wanted;
  const beforeRow = available > above;
  const start = beforeRow ? datum.start - (above - 1) : 1;
  const padRows = beforeRow ? 0 : above - available;

  const tail =
    enclosing && enclosing.end >= datum.end ? enclosing.end + SPECIMEN.symbolTail : Infinity;
  let end = Math.min(lineCount, datum.end + SPECIMEN.afterLines, tail);
  if (lineCount - end <= SPECIMEN.inlineHidden) end = lineCount;

  return finish(
    {
      padRows,
      start,
      end,
      hiddenBefore: range(1, start - 1),
      hiddenAfter: range(end + 1, lineCount),
      beforeRow,
    },
    datum,
  );
}

function stripWindow(input: WindowInput): SpecimenWindow {
  const { lineCount, datum, expanded } = input;
  const context = input.context ?? SPECIMEN.stripContext;
  const start = expanded ? 1 : Math.max(1, datum.start - context);
  const end = expanded ? lineCount : Math.min(lineCount, datum.end + context);
  return finish(
    {
      padRows: 0,
      start,
      end,
      hiddenBefore: range(1, start - 1),
      hiddenAfter: range(end + 1, lineCount),
      beforeRow: false,
    },
    datum,
  );
}

export function codeWindow(input: WindowInput): SpecimenWindow {
  return input.mode === "strip" ? stripWindow(input) : panelWindow(input);
}
