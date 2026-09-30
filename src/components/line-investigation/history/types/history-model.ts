import type { ViewArtifact } from "../../model/types";
import type { HistoryItem } from "./history-item";
import type { HistoryStratum } from "./history-stratum";

export type HistoryModel = {
  items: HistoryItem[];
  strata: HistoryStratum[];
  loose: ViewArtifact[];
  originDays: number | null;
};
