export type EntailmentStatus = "supported" | "weak" | "unsupported";

export type CitationCheck = {
  citation: string;
  claim?: number;
  status: EntailmentStatus;
  quote: string | null;
  rejectedQuotes?: string[];
  code?: "agrees" | "contradicts";
  bearing?: "line" | "elsewhere";
  reason: string;
};

export type Entailment = {
  checked: boolean;
  checks: CitationCheck[];
  supported: number;
  misattributed: number;
  failed?: number;
  fallbacks?: number;
};
