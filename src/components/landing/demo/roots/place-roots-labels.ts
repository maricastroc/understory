import { ROOTS_REACH } from "./roots-layout";
import { ROOTS_TAIL } from "./roots-variants";
import type { RootsLabel, RootsLayout, RootsNode, RootsVariant } from "./types";

export const LABEL_LINE = 20;
export const LABEL_TWO = 40;
const GAP_WIDE = 104;
const GAP_NARROW = 60;
const SPACING = 4;

function stack<T extends { top: number; height: number }>(items: T[]): T[] {
  let floor = Number.NEGATIVE_INFINITY;
  return [...items]
    .sort((a, b) => a.top - b.top)
    .map((item) => {
      const top = Math.max(item.top, floor);
      floor = top + item.height + SPACING;
      return { ...item, top };
    });
}

function anchorOf(node: RootsNode): number {
  return node.kind === "pull_request" ? node.bottom : node.y;
}

function gapGroups(layout: RootsLayout) {
  const groups = new Map<string, { id: string; x: number; y: number }>();
  for (const s of layout.sockets) {
    const prev = groups.get(s.gap.id);
    if (!prev || s.x > prev.x) groups.set(s.gap.id, { id: s.gap.id, x: s.x, y: s.y });
  }
  return [...groups.values()];
}

function beside(layout: RootsLayout, v: RootsVariant, revealed: ReadonlySet<string>) {
  const height = (id: string) => (revealed.has(id) ? LABEL_TWO : LABEL_LINE);
  const at = (node: RootsNode, x: number, top: number, align: RootsLabel["align"]) =>
    ({
      id: node.id,
      kind: "artifact",
      x,
      top,
      height: height(node.id),
      width: null,
      align,
      depth: anchorOf(node),
      leader: null,
    }) satisfies RootsLabel;
  const lane = (kind: RootsNode["kind"]) => layout.nodes.filter((n) => n.kind === kind);

  const gaps = gapGroups(layout).map(({ id, x, y }): RootsLabel => {
    const left = x + v.socket.width / 2 + 14;
    return {
      id,
      kind: "gap",
      x: left,
      top: y - LABEL_LINE / 2,
      height: GAP_WIDE,
      width: v.width === null ? null : v.width - left,
      align: "start",
      depth: y,
      leader: null,
    };
  });

  return [
    ...lane("commit").map((n) => at(n, v.stemX + 12, n.y - 6 - height(n.id), "start")),
    ...lane("pull_request").map((n) => at(n, n.x - 6, n.bottom + 6, "start")),
    ...stack(lane("review").map((n) => at(n, n.x + 12, n.y - LABEL_LINE / 2, "start"))),
    ...stack(lane("issue").map((n) => at(n, n.x - 16, n.y - LABEL_LINE / 2, "end"))),
    ...gaps,
  ];
}

function column(
  layout: RootsLayout,
  v: RootsVariant,
  labelX: number,
  revealed: ReadonlySet<string>,
) {
  const entries = [
    ...layout.nodes.map((node) => ({
      id: node.id,
      kind: "artifact" as const,
      from: node.x + (node.kind === "review" ? 2 : ROOTS_REACH[node.kind] + 1),
      depth: anchorOf(node),
      height: revealed.has(node.id) ? LABEL_TWO : LABEL_LINE,
    })),
    ...gapGroups(layout).map(({ id, x, y }) => ({
      id,
      kind: "gap" as const,
      from: x + v.socket.width / 2,
      depth: y,
      height: GAP_NARROW,
    })),
  ];
  const bend = labelX - 12;
  return stack(entries.map((e) => ({ ...e, top: e.depth - LABEL_LINE / 2 }))).map(
    ({ from, ...e }): RootsLabel => {
      const end = e.top + LABEL_LINE / 2;
      return {
        ...e,
        x: labelX,
        width: null,
        align: "start",
        leader: [
          [from, e.depth],
          [bend, e.depth],
          [bend, end],
          [labelX - 4, end],
        ],
      };
    },
  );
}

export function placeRootsLabels(
  layout: RootsLayout,
  variant: RootsVariant,
  revealed: ReadonlySet<string>,
): RootsLabel[] {
  const labels =
    variant.labelX === null
      ? beside(layout, variant, revealed)
      : column(layout, variant, variant.labelX, revealed);
  return labels.sort((a, b) => a.depth - b.depth);
}

export function rootsHeight(layout: RootsLayout, labels: RootsLabel[]): number {
  const tail = layout.nodes.length ? layout.stem.bottom + ROOTS_TAIL : layout.bottom;
  return Math.ceil(Math.max(tail, layout.bottom, ...labels.map((l) => l.top + l.height)) + 8);
}
