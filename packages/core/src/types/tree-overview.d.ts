import type { HeadCommit } from "./head-commit";
import type { ShownFile } from "./shown-file";

export type TreeOverview = {
  head: HeadCommit | null;
  total: number;
  truncated: boolean;
  shallow: boolean;
  mappable: boolean;
  prData: "github" | "none";
  recentCommits: number;
  files: ShownFile[];
};
