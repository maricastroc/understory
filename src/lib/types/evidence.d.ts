import type { Artifact } from "./artifact";
import type { CodeLocation } from "./code-location";
import type { RepoRef } from "./repo-ref";

export type Evidence = {
  question: string;
  repo: RepoRef;
  location: CodeLocation;
  artifacts: Artifact[];
};
