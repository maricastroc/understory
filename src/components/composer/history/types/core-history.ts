import type { MarkView } from "./mark-view";

export type CoreHistory = {
  bottom: number;
  breakY: number | null;
  marks: MarkView[];
  cut: boolean;
  oldestDays: number;
  commits: number;
  lines: number;
  shares: { found: number; none: number; unknown: number };
};
