import type { SpecimenMode } from "../../specimen/types";

export type InstrumentGeometry = {
  mode: SpecimenMode;
  panelWidth: number;
  shift: number;
  whyLeft: number;
  labelWidth: number | null;
  ruleLeft: number;
};
