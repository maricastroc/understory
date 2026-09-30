import type { ViewArtifact, ViewGap } from "../../model/types";
import type { HistoryMember } from "./history-member";

export type HistoryStratum = {
  id: string;
  time: number;
  anchor: ViewArtifact;
  members: HistoryMember[];
  gaps: ViewGap[];
  current: boolean;
};
