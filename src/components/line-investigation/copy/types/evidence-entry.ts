import type { ViewArtifact, ViewGap } from "../../model/types";

export type EvidenceEntry =
  | { id: string; type: "artifact"; artifact: ViewArtifact }
  | { id: string; type: "gap"; gap: ViewGap; after: ViewArtifact };
