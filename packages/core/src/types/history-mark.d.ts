import type { PrLookup } from "./pr-lookup";

export type HistoryMark = {
  sha: string;
  at: string;
  lines: number;
  prLookup: PrLookup;
  boundary: boolean;
};
