import type { Artifact, ArtifactKind, PrLookup } from "@git-investigator/core/types";
import type { ViewQuote } from "./view-quote";

export type ViewArtifact = {
  id: string;
  kind: ArtifactKind;
  letter: string;
  title: string;
  date: string;
  endDate: string | null;
  daysBeforeNow: number | null;
  role: "cited" | "supporting";
  citedBy: string[];
  verified: boolean;
  quotes: ViewQuote[];
  onBore: boolean;
  parentId: string | null;
  reviewState: string | null;
  prLookup: PrLookup | null;
  source: Artifact;
};
