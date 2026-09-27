import type { MarkView } from "./mark-view";

export type CoreHistory = {
  bottom: number;
  marks: MarkView[];
  cut: boolean;
  oldestDays: number;
  commits: number;
  lines: number;
  shares: { found: number; none: number; unknown: number };
};
