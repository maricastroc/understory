import type { RailStatus } from "./rail-status";

export type RailItem = {
  id: string;
  kind: "line" | "pr";
  title: string;
  subline: string;
  status: RailStatus;
  child: boolean;
  current: boolean;
  parentId?: string;
};
