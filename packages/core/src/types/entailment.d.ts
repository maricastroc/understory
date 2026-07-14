export type EntailmentStatus = "supported" | "weak" | "unsupported";

export type CitationCheck = {
  citation: string;
  // Index of the claim this source was audited for, when the audit judged whole claims
  // (the line flow). Sources sharing a claim index were judged together, so confidence
  // counts them once. Absent when sources were judged individually (the diff flow).
  claim?: number;
  status: EntailmentStatus;
  quote: string | null;
  reason: string;
};

export type Entailment = {
  checked: boolean;
  checks: CitationCheck[];
  supported: number;
  misattributed: number;
};
