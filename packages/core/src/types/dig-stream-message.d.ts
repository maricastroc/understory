import type { Evidence } from "./evidence";
import type { Lineage } from "./reading";
import type { VerifiedNarrative } from "./verified-narrative";

export type DigStreamMessage =
  | { phase: "evidence"; evidence: Evidence }
  | { phase: "final"; narrative: VerifiedNarrative | null; error?: string }
  | { phase: "lineage"; lineage: Lineage; ms: number };
