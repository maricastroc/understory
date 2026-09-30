import type { ArtifactKind } from "@git-investigator/core/types";
import { boreInput } from "../../../line-investigation/layout/bore-input";
import { timeAxis } from "../../../line-investigation/layout/time-axis";
import type { InvestigationView, ViewGap } from "../../../line-investigation/model/types";
import { ROOTS_AXIS, groundY } from "./roots-variants";
import type { RootsLane, RootsLayout, RootsNode, RootsSocket, RootsVariant } from "./types";

type Box = Omit<RootsNode, "via" | "d">;

export const ROOTS_REACH: Record<ArtifactKind, number> = {
  commit: 7,
  pull_request: 6,
  review: 0,
  issue: 8.5,
};

const BAND_MIN = 12;

const GAP_LANES: Record<ViewGap["missing"], RootsLane[]> = {
  pull_request: ["issue", "pull_request", "review"],
  review: ["review"],
  issue: ["issue"],
};

const toward = (from: number, to: number, inset: number) => from + Math.sign(to - from) * inset;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function rootsLayout(view: InvestigationView, now: number, v: RootsVariant): RootsLayout {
  const top = groundY(v);
  const { items } = boreInput(view);
  if (items.length === 0) {
    return {
      nodes: [],
      sockets: [],
      stem: { top, bottom: top },
      breaks: [],
      ticks: [],
      bottom: top,
    };
  }

  const times = items.flatMap((i) => (i.endTime !== null ? [i.time, i.endTime] : [i.time]));
  const axis = timeAxis(times, { now, datumY: top + v.lead }, ROOTS_AXIS);
  const cited = new Set(view.artifacts.filter((a) => a.role === "cited").map((a) => a.id));

  const boxes = new Map<string, Box>();
  for (const item of items) {
    const y = axis.yOf(item.time);
    let [upper, lower] = [y, y];
    if (item.kind === "pull_request") {
      const merged = item.endTime !== null ? axis.yOf(item.endTime) : y;
      [upper, lower] = [Math.min(y, merged), Math.max(y, merged)];
      if (lower - upper < BAND_MIN) {
        const mid = (upper + lower) / 2;
        [upper, lower] = [mid - BAND_MIN / 2, mid + BAND_MIN / 2];
      }
    }
    boxes.set(item.id, {
      id: item.id,
      kind: item.kind,
      cited: cited.has(item.id),
      x: item.kind === "commit" ? v.stemX : v.lanes[item.kind],
      y,
      top: upper,
      bottom: lower,
    });
  }

  const parentOf = new Map(view.artifacts.map((a) => [a.id, a.parentId]));
  const hostOf = (id: string): Box | undefined => {
    let cur: string | null | undefined = id;
    for (let i = 0; cur && i < 4; i++) {
      const box = boxes.get(cur);
      if (box?.kind === "commit") return box;
      cur = parentOf.get(cur);
    }
    return undefined;
  };
  const prOf = (commitId: string) =>
    [...boxes.values()].find((b) => b.kind === "pull_request" && hostOf(b.id)?.id === commitId);
  const fromStem = (host: Box, x: number) =>
    `M${toward(v.stemX, x, ROOTS_REACH.commit)} ${host.y} H`;

  const nodes: RootsNode[] = [...boxes.values()].map((b) => {
    const host = b.kind === "commit" ? undefined : hostOf(b.id);
    if (!host) return { ...b, via: null, d: "" };
    if (b.kind === "pull_request") {
      const edge = toward(b.x, v.stemX, ROOTS_REACH.pull_request);
      return {
        ...b,
        via: host.id,
        d: `${fromStem(host, b.x)}${edge} V${clamp(host.y, b.top, b.bottom)}`,
      };
    }
    if (b.kind === "issue") {
      return {
        ...b,
        via: host.id,
        d: `${fromStem(host, b.x)}${b.x} V${toward(b.y, host.y, ROOTS_REACH.issue)}`,
      };
    }
    const pr = prOf(host.id);
    if (pr) {
      const edge = toward(pr.x, b.x, ROOTS_REACH.pull_request);
      return { ...b, via: pr.id, d: `M${edge} ${clamp(b.y, pr.top, pr.bottom)} V${b.y} H${b.x}` };
    }
    return { ...b, via: host.id, d: `${fromStem(host, b.x)}${b.x} V${b.y}` };
  });

  const half = v.socket.width / 2;
  const sockets: RootsSocket[] = view.gaps.flatMap((gap) => {
    const after = boxes.get(gap.afterId);
    if (!after) return [];
    const y = after.kind === "commit" ? after.y : after.bottom;
    const reached = new Map<number, number>();
    return [...GAP_LANES[gap.missing]]
      .sort((a, b) => Math.abs(v.lanes[a] - v.stemX) - Math.abs(v.lanes[b] - v.stemX))
      .map((lane) => {
        const x = v.lanes[lane];
        const side = Math.sign(x - v.stemX);
        const start =
          reached.get(side) ??
          (after.kind !== "commit" && Math.sign(after.x - v.stemX) === side
            ? toward(after.x, x, ROOTS_REACH.pull_request)
            : toward(v.stemX, x, ROOTS_REACH.commit));
        reached.set(side, x + side * half);
        return {
          id: `${gap.id}:${lane}`,
          gap,
          lane,
          x,
          y,
          d: `M${start} ${y} H${x - side * half}`,
        };
      });
  });

  const commits = nodes.filter((n) => n.kind === "commit");
  const stemBottom = commits.length ? Math.max(...commits.map((n) => n.y)) : top;
  const bottom = Math.max(
    stemBottom,
    ...nodes.map((n) => n.bottom),
    ...sockets.map((s) => s.y + v.socket.height / 2),
  );

  return {
    nodes,
    sockets,
    stem: { top, bottom: stemBottom },
    breaks: axis.breaks,
    ticks: axis.ticks,
    bottom,
  };
}

export function rootsTrace(layout: RootsLayout, stemX: number, ids: string[]): string {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const parts = new Set<string>();
  let deepest: number | null = null;
  for (const id of ids) {
    let node = byId.get(id);
    for (let i = 0; node && i < 4; i++) {
      if (node.kind === "commit") {
        deepest = Math.max(deepest ?? node.y, node.y);
        break;
      }
      if (node.d) parts.add(node.d);
      node = node.via ? byId.get(node.via) : undefined;
    }
  }
  const stem = deepest === null ? [] : [`M${stemX} ${layout.stem.top} V${deepest}`];
  return [...stem, ...parts].join(" ");
}
