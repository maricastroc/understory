import type { ShownReason } from "@understory/core/types";

export type MapCore = {
  path: string;
  dir: string;
  name: string;
  x: number;
  reason: ShownReason;
  cases: number;
};
