import type { TraceModel } from "./types";

export function tracePath(input: {
  laneX: number;
  branchX: number;
  startY: number;
  ringX: number | null;
  targets: number[];
  silent: boolean;
  pinned: boolean;
}): TraceModel | null {
  const { laneX, branchX, startY, ringX, targets } = input;
  if (targets.length === 0) return null;
  const deepest = Math.max(...targets);
  const parts = [`M${laneX} ${startY} V${deepest}`];
  for (const y of targets) parts.push(`M${laneX} ${y} H${branchX}`);
  if (ringX !== null) parts.push(`M${laneX} ${startY} H${ringX}`);
  return {
    path: parts.join(" "),
    dots: targets.map((y) => ({ x: branchX, y })),
    silent: input.silent,
    pinned: input.pinned,
  };
}
