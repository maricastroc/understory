import type { PrSectionLayout } from "../layout/types";

const WIDTH = 236;
const OFFSET = 26;

export function tooltipAnchor(
  id: string,
  layout: PrSectionLayout,
  width: number,
): { left: number; top: number } | null {
  const band = layout.bands.find((b) => b.id === id);
  const commit = layout.commits.find((c) => c.id === id);
  const pr = layout.prs.find((p) => p.id === id);
  const issue = layout.issues.find((i) => i.id === id);
  const review = layout.reviews.find((r) => r.id === id);
  const hatch = layout.hatches.find((h) => h.id === id);
  const point = band
    ? { x: band.x2, y: band.top + 12 }
    : commit
      ? { x: commit.x, y: commit.y }
      : pr
        ? { x: pr.x, y: (pr.top + pr.bottom) / 2 }
        : issue
          ? { x: issue.x, y: issue.y }
          : review
            ? { x: review.x + 12, y: review.y }
            : hatch
              ? { x: hatch.x, y: hatch.top + hatch.height / 2 }
              : null;
  if (!point) return null;
  const flip = point.x + OFFSET + WIDTH > width;
  return {
    left: flip ? point.x - OFFSET - WIDTH : point.x + OFFSET,
    top: Math.max(layout.datumY + 10, point.y - 20),
  };
}
