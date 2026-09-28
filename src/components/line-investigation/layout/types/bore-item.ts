import type { ArtifactKind } from "@git-investigator/core/types";

export type BoreItem = {
  id: string;
  kind: ArtifactKind;
  time: number;
  endTime: number | null;
};
