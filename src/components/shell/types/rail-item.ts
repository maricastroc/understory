import type { RailStatus } from "./rail-status";

export type RailItem = {
  id: string;
  title: string;
  subline: string;
  status: RailStatus;
  child: boolean;
  current: boolean;
  parentId?: string;
};
