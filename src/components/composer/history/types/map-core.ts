import type { ShownReason } from "@git-investigator/core/types";

export type MapCore = {
  path: string;
  dir: string;
  name: string;
  x: number;
  reason: ShownReason;
  cases: number;
};
