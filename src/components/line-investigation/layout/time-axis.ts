import { clusterTimes, pxPerDay } from "./cluster-times";
import { BORE, DAY } from "./geometry";
import type { AxisBreak, DepthTick, TimeCluster } from "./types";

export type TimeAxis = {
  breaks: AxisBreak[];
  clusters: TimeCluster[];
  ticks: DepthTick[];
  bottom: number;
  clusterOf: (time: number) => number;
  yOf: (time: number) => number;
};

export function timeAxis(times: number[], opts: { now: number; datumY: number }): TimeAxis {
  const spans = clusterTimes(times);
  const breaks: AxisBreak[] = [];
  const clusters: TimeCluster[] = [];
  const newest = spans[0].newest;
  breaks.push({
    kind: "first",
    top: opts.datumY,
    height: BORE.firstSegment,
    days: (opts.now - newest) / DAY,
    strokes: opts.now - newest >= BORE.clusterDays * DAY,
  });
  let cursor = opts.datumY + BORE.firstSegment;
  spans.forEach((s, i) => {
    if (i > 0) {
      breaks.push({
        kind: "gap",
        top: cursor,
        height: BORE.breakHeight,
        days: (spans[i - 1].oldest - s.newest) / DAY,
        strokes: true,
      });
      cursor += BORE.breakHeight;
    }
    const spanDays = (s.newest - s.oldest) / DAY;
    const k = pxPerDay(spanDays);
    const top = cursor + BORE.clusterPad;
    clusters.push({ newest: s.newest, oldest: s.oldest, top, pxPerDay: k });
    cursor = top + spanDays * k + BORE.clusterPad;
  });
  const ticks: DepthTick[] = clusters.map((c, i) => ({
    y: c.top,
    days: (opts.now - c.newest) / DAY,
    cluster: i,
  }));
  const clusterOf = (t: number) => clusters.findIndex((c) => t <= c.newest && t >= c.oldest);
  const yOf = (t: number) => {
    const c = clusters[clusterOf(t)];
    return c.top + ((c.newest - t) / DAY) * c.pxPerDay;
  };
  return { breaks, clusters, ticks, bottom: cursor, clusterOf, yOf };
}
