import type { ArtifactKind } from "@understory/core/types";
import { ArtifactGlyph } from "../../line-investigation/bore/ArtifactGlyph";

export function GlyphIcon({
  kind,
  cited,
  size = 14,
}: {
  kind: ArtifactKind;
  cited: boolean;
  size?: number;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      className="shrink-0 overflow-visible"
    >
      <ArtifactGlyph
        kind={kind}
        x={kind === "review" ? -5 : 0}
        y={0}
        top={-8}
        bottom={8}
        cited={cited}
      />
    </svg>
  );
}
