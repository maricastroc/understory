import type { Contradiction } from "@git-investigator/core/types";

export type CoverageItem =
  | { kind: "regions"; explained: number; total: number }
  | { kind: "silent"; regions: string[]; directCommits: boolean }
  | { kind: "partial"; region: string; explained: number; total: number }
  | { kind: "citations"; resolved: number; total: number; unknown: string[]; misattributed: number }
  | { kind: "quotes"; verified: number }
  | { kind: "audit-unavailable"; regions: string[] }
  | { kind: "contradictions"; items: Contradiction[] }
  | { kind: "evidence-only"; error: string | null }
  | { kind: "truncated"; investigated: number; blamed: number }
  | { kind: "note"; note: string };
