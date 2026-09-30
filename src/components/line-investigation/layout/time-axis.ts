import { clusterTimes, pxPerDay } from "./cluster-times";
import { BORE, DAY } from "./geometry";
import type { AxisBreak, AxisMetrics, DepthTick, TimeCluster } from "./types";

const BORE_METRICS: AxisMetrics = {
  firstSegment: BORE.firstSegment,
  breakHeight: BORE.breakHeight,
  clusterPad: BORE.clusterPad,
  pxPerDay,
};

export type TimeAxis = {
  breaks: AxisBreak[];
  clusters: TimeCluster[];
  ticks: DepthTick[];
  bottom: number;
  clusterOf: (time: number) => number;
  yOf: (time: number) => number;
};

export function timeAxis(
  times: number[],
  opts: { now: number; datumY: number },
  metrics: AxisMetrics = BORE_METRICS,
): TimeAxis {
  const spans = clusterTimes(times);
  const breaks: AxisBreak[] = [];
  const clusters: TimeCluster[] = [];
  const newest = spans[0].newest;
  breaks.push({
    kind: "first",
    top: opts.datumY,
    height: metrics.firstSegment,
    days: (opts.now - newest) / DAY,
    strokes: opts.now - newest >= BORE.clusterDays * DAY,
  });
  let cursor = opts.datumY + metrics.firstSegment;
  spans.forEach((s, i) => {
    if (i > 0) {
      breaks.push({
        kind: "gap",
        top: cursor,
        height: metrics.breakHeight,
        days: (spans[i - 1].oldest - s.newest) / DAY,
        strokes: true,
      });
      cursor += metrics.breakHeight;
    }
    const spanDays = (s.newest - s.oldest) / DAY;
    const k = metrics.pxPerDay(spanDays);
    const top = cursor + metrics.clusterPad;
    clusters.push({ newest: s.newest, oldest: s.oldest, top, pxPerDay: k });
    cursor = top + spanDays * k + metrics.clusterPad;
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
