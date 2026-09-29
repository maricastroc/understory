import type { ArtifactKind } from "@understory/core/types";

export type BoreMark = {
  id: string;
  kind: ArtifactKind;
  members: string[];
  cited: boolean;
  active: boolean;
  y: number;
  top: number;
  bottom: number;
  anchorY: number;
};
