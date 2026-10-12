import type { Artifact } from "./artifact";
import type { ArtifactRef } from "./artifact-ref";
import type { CodeContext } from "./code-context";
import type { CodeLocation } from "./code-location";
import type { Contradiction } from "./contradiction";
import type { Coverage } from "./coverage";
import type { RepoRef } from "./repo-ref";

export type Evidence = {
  question: string;
  repo: RepoRef;
  location?: CodeLocation;
  anchor?: ArtifactRef;
  code?: CodeContext;
  artifacts: Artifact[];
  contradictions: Contradiction[];
  note?: string;
  coverage?: Coverage;
};
