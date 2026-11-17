import type { ViewArtifact, ViewClause, ViewQuote } from "../../../line-investigation/model/types";
import type { LineVersion } from "../../demo/strata/types";

export type DigRecord = {
  artifact: ViewArtifact;
  excerpt: string | null;
  quote: ViewQuote | null;
  clause: ViewClause | null;
  version: LineVersion | null;
};
