import type { LineRange } from "./types";

export function rangeLabel(range: LineRange, symbol: string | null): string {
  const lines =
    range.start === range.end ? `line ${range.start}` : `lines ${range.start}–${range.end}`;
  return symbol ? `⋯ ${lines} · ${symbol}` : `⋯ ${lines}`;
}
