import type { ArtifactKind } from "@understory/core/types";

export type RootsNode = {
  id: string;
  kind: ArtifactKind;
  cited: boolean;
  x: number;
  y: number;
  top: number;
  bottom: number;
  via: string | null;
  d: string;
};
