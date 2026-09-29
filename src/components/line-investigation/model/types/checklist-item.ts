import type { Contradiction } from "@understory/core/types";
import type { ChecklistTone } from "./checklist-tone";

export type ChecklistItem =
  | { kind: "clauses-grounded"; tone: ChecklistTone; grounded: number; total: number }
  | {
      kind: "citations-resolved";
      tone: ChecklistTone;
      resolved: number;
      total: number;
      unknown: string[];
    }
  | {
      kind: "quotes";
      tone: ChecklistTone;
      verified: number;
      weak: number;
      misattributed: number;
      unaudited: number;
    }
  | { kind: "audit-unavailable"; tone: ChecklistTone }
  | { kind: "uncited-claims"; tone: ChecklistTone; count: number }
  | { kind: "contradictions"; tone: ChecklistTone; items: Contradiction[] }
  | { kind: "file-granularity"; tone: ChecklistTone; note: string | null }
  | { kind: "collection-note"; tone: ChecklistTone; note: string }
  | { kind: "cosmetic-origin"; tone: ChecklistTone; ref: string }
  | { kind: "not-recorded"; tone: ChecklistTone; answer: string }
  | { kind: "out-of-scope"; tone: ChecklistTone; answer: string }
  | { kind: "evidence-only"; tone: ChecklistTone; error: string | null };
