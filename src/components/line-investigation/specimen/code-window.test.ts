import { enclosingSymbol } from "@git-investigator/core/collect/symbol";
import { describe, expect, it } from "vitest";
import { syntheticChargeLines } from "../fixtures/synthetic-charge-file";
import { codeWindow } from "./code-window";
import { datumYFor, rowsAboveFor } from "./datum-y";

const lines = syntheticChargeLines;
const enclosing = enclosingSymbol(lines, 9, "charge.ts");
const base = {
  lineCount: lines.length,
  datum: { start: 9, end: 9 },
  enclosing,
  mode: "panel" as const,
  expanded: false,
};

describe("datumY", () => {
  it("is the bottom edge of the investigated row, counted from the panel's outer top", () => {
    expect(datumYFor(8)).toBe(1 + 36 + 10 + 9 * 26);
    expect(datumYFor(8)).toBe(281);
  });

  it("finds the rows needed above the datum to reach a target", () => {
    expect(rowsAboveFor(281)).toBe(8);
    expect(rowsAboveFor(290)).toBe(9);
    expect(rowsAboveFor(40)).toBe(0);
    expect(datumYFor(rowsAboveFor(400))).toBeGreaterThanOrEqual(400);
  });
});

describe("codeWindow — panel", () => {
  it("reproduces the v4 window: lines 1–19, rest collapsed, datum at 281", () => {
    expect(codeWindow(base)).toEqual({
      padRows: 0,
      start: 1,
      end: 19,
      hiddenBefore: null,
      hiddenAfter: { start: 20, end: 24 },
      beforeRow: false,
      rowsAboveDatum: 8,
      datumY: 281,
    });
  });

  it("pads above a line near the top of the file so the datum still meets the target", () => {
    const w = codeWindow({ ...base, datum: { start: 2, end: 2 }, enclosing: null });
    expect(w.padRows).toBe(7);
    expect(w.start).toBe(1);
    expect(w.datumY).toBe(281);
  });

  it("collapses lines above into one row when the file has more than fits", () => {
    const long = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`);
    const w = codeWindow({
      ...base,
      lineCount: long.length,
      datum: { start: 120, end: 120 },
      enclosing: null,
    });
    expect(w.beforeRow).toBe(true);
    expect(w.hiddenBefore).toEqual({ start: 1, end: 112 });
    expect(w.start).toBe(113);
    expect(w.rowsAboveDatum).toBe(8);
    expect(w.datumY).toBe(281);
    expect(w.end).toBe(130);
  });

  it("grows the window upward when the why zone needs a lower datum", () => {
    const long = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`);
    const w = codeWindow({
      ...base,
      lineCount: long.length,
      datum: { start: 120, end: 120 },
      enclosing: null,
      targetDatumY: 400,
    });
    expect(w.datumY).toBeGreaterThanOrEqual(400);
    expect(w.datumY - 400).toBeLessThan(26);
  });

  it("stops shortly after the enclosing function instead of running into the next one", () => {
    const long = [
      "function a() {",
      "  one();",
      "  two();",
      "}",
      ...Array.from({ length: 30 }, (_, i) => `filler ${i}`),
    ];
    const w = codeWindow({
      ...base,
      lineCount: long.length,
      datum: { start: 2, end: 2 },
      enclosing: enclosingSymbol(long, 2, "a.ts"),
    });
    expect(w.end).toBe(6);
    expect(w.hiddenAfter).toEqual({ start: 7, end: 34 });
  });

  it("shows up to two trailing lines instead of collapsing them", () => {
    const w = codeWindow({ ...base, lineCount: 21, enclosing: null });
    expect(w.end).toBe(21);
    expect(w.hiddenAfter).toBeNull();
  });

  it("aligns the bottom of a multi-line datum", () => {
    const w = codeWindow({ ...base, datum: { start: 9, end: 11 } });
    expect(w.datumY).toBeGreaterThanOrEqual(281);
    expect(w.datumY).toBe(datumYFor(w.rowsAboveDatum, 3));
  });

  it("shows the whole file when expanded", () => {
    const w = codeWindow({ ...base, expanded: true });
    expect([w.start, w.end, w.hiddenBefore, w.hiddenAfter]).toEqual([1, 24, null, null]);
    expect(w.datumY).toBe(281);
  });
});

describe("codeWindow — strip", () => {
  it("shows the investigated line ±3 with no padding", () => {
    const w = codeWindow({ ...base, mode: "strip", context: 3 });
    expect([w.start, w.end, w.padRows, w.beforeRow]).toEqual([6, 12, 0, false]);
    expect(w.hiddenBefore).toEqual({ start: 1, end: 5 });
    expect(w.hiddenAfter).toEqual({ start: 13, end: 24 });
    expect(w.datumY).toBe(datumYFor(3));
  });

  it("narrows to ±2 on compact screens", () => {
    const w = codeWindow({ ...base, mode: "strip", context: 2 });
    expect([w.start, w.end]).toEqual([7, 11]);
  });

  it("opens the whole file on 'Show file'", () => {
    const w = codeWindow({ ...base, mode: "strip", context: 2, expanded: true });
    expect([w.start, w.end]).toEqual([1, 24]);
    expect(w.datumY).toBe(datumYFor(8));
  });
});
