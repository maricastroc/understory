import type { Artifact } from "./artifact";
import type { ArtifactRef } from "./artifact-ref";
import type { CodeLocation } from "./code-location";
import type { Contradiction } from "./contradiction";
import type { Coverage } from "./coverage";
import type { RepoRef } from "./repo-ref";

export type Evidence = {
  question: string;
  repo: RepoRef;
  location?: CodeLocation;
  anchor?: ArtifactRef;
  artifacts: Artifact[];
  contradictions: Contradiction[];
  note?: string;
  // Set for line-located investigations; absent for artifact drill-downs (no line to blame).
  coverage?: Coverage;
};
