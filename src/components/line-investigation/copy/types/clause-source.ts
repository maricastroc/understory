import type { TallyCell, ViewArtifact, ViewGap, ViewQuote } from "../../model/types";

export type ClauseSource =
  | {
      id: string;
      type: "artifact";
      artifact: ViewArtifact;
      cell: TallyCell | null;
      quote: ViewQuote | null;
    }
  | { id: string; type: "missing"; citation: string }
  | { id: string; type: "gap"; gap: ViewGap; after: ViewArtifact };
