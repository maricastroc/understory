import { BORE } from "./geometry";
import type { BoreLayout } from "./types";

export type BoreFold = {
  layout: BoreLayout;
  top: number;
  hiddenArtifacts: string[];
  hidden: ReadonlySet<string>;
};

export function foldBore(
  layout: BoreLayout,
  opts: { datumY: number; limit: number; pitch: number },
): BoreFold | null {
  const cut = layout.labels.findIndex((l) => l.top + opts.pitch > opts.limit);
  if (cut < 0 || layout.labels.length - cut < BORE.foldMin) return null;

  const top = layout.labels[cut].top;
  const kept = new Set(layout.labels.slice(0, cut).map((l) => l.id));
  const hiddenGlyphs = layout.glyphs.filter((g) => !kept.has(g.id));
  const hiddenArtifacts = hiddenGlyphs.flatMap((g) => g.members);
  const hiddenGaps = layout.gaps.filter((g) => !kept.has(g.afterId)).map((g) => g.id);

  return {
    top,
    hiddenArtifacts,
    hidden: new Set([...hiddenGlyphs.map((g) => g.id), ...hiddenArtifacts, ...hiddenGaps]),
    layout: {
      glyphs: layout.glyphs.filter((g) => kept.has(g.id)),
      gaps: layout.gaps.filter((g) => kept.has(g.afterId)),
      labels: layout.labels.slice(0, cut),
      leaders: layout.leaders.filter((l) => kept.has(l.id)),
      breaks: layout.breaks.filter((b) => b.top < top),
      ticks: layout.ticks.filter((t) => t.y < top),
      height: top + BORE.foldRow - opts.datumY,
    },
  };
}
