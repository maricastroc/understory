import type { ArtifactRef } from "@understory/core";

export type DigRequest = {
  repoPath: string;
  location?: string;
  target?: ArtifactRef;
  question?: string;
};
