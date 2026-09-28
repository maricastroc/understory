import { BORE, DAY } from "./geometry";

export type AxisScale = {
  clusterDays: number;
  minPxPerDay: number;
  maxPxPerDay: number;
  spanBudget: number;
  firstSegment: number;
  breakHeight: number;
  clusterPad: number;
};

export const LINE_SCALE: AxisScale = {
  clusterDays: BORE.clusterDays,
  minPxPerDay: BORE.minPxPerDay,
  maxPxPerDay: BORE.maxPxPerDay,
  spanBudget: BORE.spanBudget,
  firstSegment: BORE.firstSegment,
  breakHeight: BORE.breakHeight,
  clusterPad: BORE.clusterPad,
};

export function clusterTimes(
  times: number[],
  clusterDays: number = BORE.clusterDays,
): Array<{ newest: number; oldest: number }> {
  const limit = clusterDays * DAY;
  const out: Array<{ newest: number; oldest: number }> = [];
  for (const t of [...new Set(times)].sort((a, b) => b - a)) {
    const current = out[out.length - 1];
    if (current && current.oldest - t < limit && current.newest - t < limit) current.oldest = t;
    else out.push({ newest: t, oldest: t });
  }
  return out;
}

export function pxPerDay(spanDays: number, scale: AxisScale = LINE_SCALE): number {
  if (spanDays <= 0) return scale.maxPxPerDay;
  return Math.min(scale.maxPxPerDay, Math.max(scale.minPxPerDay, scale.spanBudget / spanDays));
}
