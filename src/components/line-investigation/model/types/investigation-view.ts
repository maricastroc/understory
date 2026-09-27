import type { CodeLocation, Confidence, RepoRef } from "@git-investigator/core/types";
import type { ChainLinks } from "./chain-links";
import type { ChecklistItem } from "./checklist-item";
import type { Verdict } from "./verdict";
import type { ViewArtifact } from "./view-artifact";
import type { ViewClause } from "./view-clause";
import type { ViewGap } from "./view-gap";

export type InvestigationView = {
  verdict: Verdict;
  question: string;
  repo: RepoRef;
  location: CodeLocation | null;
  pinnedSha: string | null;
  granularity: "line" | "file";
  artifacts: ViewArtifact[];
  clauses: ViewClause[];
  gaps: ViewGap[];
  links: ChainLinks | null;
  checklist: ChecklistItem[];
  confidence: Confidence | null;
  answer: string | null;
  error: string | null;
};
