import { MAX_BLAME_WINDOW } from "@git-investigator/core/collect/blame-limits";
import type { LineRange } from "./types";

export function blameRequestRange(visible: LineRange, datum: LineRange): LineRange {
  if (visible.end - visible.start + 1 <= MAX_BLAME_WINDOW) return visible;
  const lead = Math.floor((MAX_BLAME_WINDOW - (datum.end - datum.start + 1)) / 2);
  const start = Math.max(
    visible.start,
    Math.min(datum.start - lead, visible.end - MAX_BLAME_WINDOW + 1),
  );
  return { start, end: start + MAX_BLAME_WINDOW - 1 };
}
