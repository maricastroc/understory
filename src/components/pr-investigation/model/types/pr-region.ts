import type { LineRange, TargetHunk } from "@git-investigator/core/diff/types";
import type { RegionState } from "./region-state";

export type PrRegion = {
  key: string;
  id: string;
  index: number;
  path: string;
  dir: string;
  file: string;
  range: LineRange;
  findings: number[];
  artifactIds: string[];
  state: RegionState;
  hunk: TargetHunk | null;
  group: number;
};
