import type { RegionState } from "../../model/types";

export type CoreLayout = {
  key: string;
  regionIds: string[];
  label: string;
  x: number;
  bottom: number;
  cap: boolean;
  state: RegionState;
  grouped: boolean;
};
