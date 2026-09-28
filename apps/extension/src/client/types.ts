import type { ArtifactRef } from "@git-investigator/core";

export type DigRequest = {
  repoPath: string;
  location?: string;
  target?: ArtifactRef;
  question?: string;
};
