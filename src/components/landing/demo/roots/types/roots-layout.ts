import type { AxisBreak, DepthTick } from "../../../../line-investigation/layout/types";
import type { RootsNode } from "./roots-node";
import type { RootsSocket } from "./roots-socket";

export type RootsLayout = {
  nodes: RootsNode[];
  sockets: RootsSocket[];
  stem: { top: number; bottom: number };
  breaks: AxisBreak[];
  ticks: DepthTick[];
  bottom: number;
};
