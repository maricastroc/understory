import type { AxisMetrics } from "../../../line-investigation/layout/types";
import type { RootsVariant } from "./types";

export const ROOTS_AXIS: AxisMetrics = {
  firstSegment: 40,
  breakHeight: 36,
  clusterPad: 8,
  pxPerDay: (spanDays) => (spanDays <= 0 ? 12 : Math.min(12, Math.max(6, 110 / spanDays))),
};

export const ROOTS_TAIL = 36;
export const ROOTS_FRAME_WIDTH = 1120;
export const ROOTS_WHY_HEIGHT = 150;

export const ROOTS_WIDE: RootsVariant = {
  mode: "wide",
  width: ROOTS_FRAME_WIDTH,
  stemX: 560,
  lanes: { issue: 370, pull_request: 710, review: 850 },
  socket: { width: 46, height: 20 },
  font: 14,
  row: 28,
  context: 2,
  codeTop: 18,
  lead: 30,
  labelX: null,
};

export const ROOTS_NARROW: RootsVariant = {
  mode: "narrow",
  width: null,
  stemX: 44,
  lanes: { issue: 72, pull_request: 100, review: 128 },
  socket: { width: 20, height: 14 },
  font: 12,
  row: 24,
  context: 1,
  codeTop: 18,
  lead: 18,
  labelX: 152,
};

export function groundY(variant: RootsVariant): number {
  return variant.codeTop + (variant.context + 1) * variant.row;
}
