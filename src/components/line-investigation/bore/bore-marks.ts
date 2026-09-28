import type { BoreLayout } from "../layout/types";
import type { ViewArtifact } from "../model/types";
import type { BoreMark } from "./types";

export function boreMarks(
  layout: BoreLayout,
  byId: Map<string, ViewArtifact>,
  active: Set<string> | null,
): BoreMark[] {
  return layout.glyphs.map((g) => {
    const members = g.members.map((m) => byId.get(m)).filter((a): a is ViewArtifact => !!a);
    return {
      id: g.id,
      kind: g.kind,
      members: g.members,
      cited: members.some((m) => m.role === "cited"),
      active: !active || g.members.some((m) => active.has(m)),
      y: g.y,
      top: g.top,
      bottom: g.bottom,
      anchorY: g.anchorY,
    };
  });
}

export function markCenter(mark: Pick<BoreMark, "kind" | "y" | "top" | "bottom">): number {
  return mark.kind === "pull_request" ? (mark.top + mark.bottom) / 2 : mark.y;
}
