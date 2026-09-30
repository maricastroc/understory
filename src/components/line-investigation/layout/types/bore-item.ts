import type { ArtifactKind } from "@understory/core/types";

export type BoreItem = {
  id: string;
  kind: ArtifactKind;
  time: number;
  endTime: number | null;
};
