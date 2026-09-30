import type { ViewArtifact, ViewGap, ViewQuote } from "../../../../line-investigation/model/types";
import type { LineVersion } from "./line-version";

export type Stratum = {
  artifact: ViewArtifact;
  layer: "main" | "sub";
  rule: "solid" | "dashed" | null;
  top: number;
  row: number;
  node: number;
  bottom: number;
  current: boolean;
  quote: ViewQuote | null;
  version: LineVersion | null;
  versionY: number | null;
  gap: ViewGap | null;
};
