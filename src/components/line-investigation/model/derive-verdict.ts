import type { DigResult } from "@git-investigator/core/types";
import type { Verdict } from "./types";

export function deriveVerdict(result: DigResult, pending: boolean): Verdict {
  const n = result.narrative;
  if (pending) return "pending";
  if (!n) return "evidence-only";
  if (n.answerable === false) return "out-of-scope";
  if (!n.grounded) return "fabrication";
  if (!n.recorded) return "not-recorded";
  return "resolved";
}
