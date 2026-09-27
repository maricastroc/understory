import type { ArtifactKind } from "@git-investigator/core/types";

export type GlyphPlacement = {
  id: string;
  kind: ArtifactKind;
  members: string[];
  y: number;
  top: number;
  bottom: number;
  anchorY: number;
  leaderX: number;
  cluster: number;
};
