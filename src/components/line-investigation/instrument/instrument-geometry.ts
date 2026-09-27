import { BORE } from "../layout/geometry";
import type { SpecimenLayout } from "../specimen/types";
import type { InstrumentGeometry } from "./types";

const STRIP_CORE_X = 48;
const WHY_GAP = 12;
const LABEL_WIDTH = 252;
const PANEL_WIDTH = { wide: 460, narrow: 420 } as const;

export function instrumentGeometry(layout: SpecimenLayout): InstrumentGeometry {
  if (layout.mode === "strip") {
    return {
      mode: "strip",
      panelWidth: 0,
      shift: STRIP_CORE_X - BORE.coreX,
      whyLeft: 0,
      labelWidth: null,
      ruleLeft: 0,
    };
  }
  const panelWidth = layout.width === "narrow" ? PANEL_WIDTH.narrow : PANEL_WIDTH.wide;
  return {
    mode: "panel",
    panelWidth,
    shift: panelWidth - PANEL_WIDTH.wide,
    whyLeft: panelWidth + WHY_GAP,
    labelWidth: LABEL_WIDTH,
    ruleLeft: panelWidth,
  };
}
