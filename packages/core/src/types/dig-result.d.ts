import type { Evidence } from "./evidence";
import type { VerifiedNarrative } from "./verified-narrative";

export type DigResult = {
  evidence: Evidence;
  narrative: VerifiedNarrative | null;
  error?: string;
};
