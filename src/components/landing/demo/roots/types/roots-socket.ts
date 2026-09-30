import type { ViewGap } from "../../../../line-investigation/model/types";
import type { RootsLane } from "./roots-lane";

export type RootsSocket = {
  id: string;
  gap: ViewGap;
  lane: RootsLane;
  x: number;
  y: number;
  d: string;
};
