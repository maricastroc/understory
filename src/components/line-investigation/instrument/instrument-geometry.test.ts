import { describe, expect, it } from "vitest";
import { SPECIMEN_LAYOUTS } from "../specimen/use-specimen-layout";
import { instrumentGeometry } from "./instrument-geometry";

describe("instrumentGeometry", () => {
  it("matches the v4 coordinates at 460px: core 500, labels 546, why rows from 472", () => {
    expect(instrumentGeometry(SPECIMEN_LAYOUTS.wide)).toEqual({
      mode: "panel",
      panelWidth: 460,
      shift: 0,
      whyLeft: 472,
      labelWidth: 252,
      ruleLeft: 460,
    });
  });

  it("shifts everything 40px left with the 420px panel", () => {
    const g = instrumentGeometry(SPECIMEN_LAYOUTS.narrow);
    expect([g.shift, g.whyLeft, g.ruleLeft]).toEqual([-40, 432, 420]);
  });

  it("puts the core near the left edge in strip mode with a full-width rule", () => {
    const g = instrumentGeometry(SPECIMEN_LAYOUTS.compact);
    expect(500 + g.shift).toBe(48);
    expect([g.whyLeft, g.ruleLeft, g.labelWidth]).toEqual([0, 0, null]);
  });
});
