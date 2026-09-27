import { BORE, DAY } from "./geometry";

export function clusterTimes(times: number[]): Array<{ newest: number; oldest: number }> {
  const limit = BORE.clusterDays * DAY;
  const out: Array<{ newest: number; oldest: number }> = [];
  for (const t of [...new Set(times)].sort((a, b) => b - a)) {
    const current = out[out.length - 1];
    if (current && current.oldest - t < limit && current.newest - t < limit) current.oldest = t;
    else out.push({ newest: t, oldest: t });
  }
  return out;
}

export function pxPerDay(spanDays: number): number {
  if (spanDays <= 0) return BORE.maxPxPerDay;
  return Math.min(BORE.maxPxPerDay, Math.max(BORE.minPxPerDay, BORE.spanBudget / spanDays));
}
