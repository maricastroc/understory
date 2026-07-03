import type { ArtifactKind } from "./artifact-kind";
import type { Person } from "./person";

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  body: string;
  url: string;
  date: string;
  author?: Person;
  ref?: string;
  meta?: Record<string, string | number>;
};
