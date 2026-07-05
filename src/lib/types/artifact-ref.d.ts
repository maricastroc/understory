import type { ArtifactKind } from "./artifact-kind";

export type ArtifactRef = {
  kind: ArtifactKind;
  id: string;
  ref?: string;
  title?: string;
  number?: number;
  oid?: string;
};
