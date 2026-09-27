import { type AxisScale, clusterTimes, LINE_SCALE, pxPerDay } from "./cluster-times";
import { DAY } from "./geometry";
import type { AxisBreak, DepthTick, TimeCluster } from "./types";

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
  opts: { now: number; datumY: number; scale?: AxisScale },
): TimeAxis {
  const scale = opts.scale ?? LINE_SCALE;
  const spans = clusterTimes(times, scale.clusterDays);
  const breaks: AxisBreak[] = [];
  const clusters: TimeCluster[] = [];
  const newest = spans[0].newest;
  breaks.push({
    kind: "first",
    top: opts.datumY,
    height: scale.firstSegment,
    days: (opts.now - newest) / DAY,
    strokes: opts.now - newest >= scale.clusterDays * DAY,
  });
  let cursor = opts.datumY + scale.firstSegment;
  spans.forEach((s, i) => {
    if (i > 0) {
      breaks.push({
        kind: "gap",
        top: cursor,
        height: scale.breakHeight,
        days: (spans[i - 1].oldest - s.newest) / DAY,
        strokes: true,
      });
      cursor += scale.breakHeight;
    }
    const spanDays = (s.newest - s.oldest) / DAY;
    const k = pxPerDay(spanDays, scale);
    const top = cursor + scale.clusterPad;
    clusters.push({ newest: s.newest, oldest: s.oldest, top, pxPerDay: k });
    cursor = top + spanDays * k + scale.clusterPad;
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
