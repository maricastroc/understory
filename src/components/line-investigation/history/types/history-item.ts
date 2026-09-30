import type { HistoryStratum } from "./history-stratum";

export type HistoryItem =
  | { type: "stratum"; stratum: HistoryStratum; index: number }
  | { type: "break"; days: number; first: boolean }
  | { type: "run"; id: string; items: HistoryItem[]; strata: HistoryStratum[] };
