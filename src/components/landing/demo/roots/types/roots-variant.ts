import type { RootsLane } from "./roots-lane";

export type RootsVariant = {
  mode: "wide" | "narrow";
  width: number | null;
  stemX: number;
  lanes: Record<RootsLane, number>;
  socket: { width: number; height: number };
  font: number;
  row: number;
  context: number;
  codeTop: number;
  lead: number;
  labelX: number | null;
};
