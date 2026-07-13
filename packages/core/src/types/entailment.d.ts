export type EntailmentStatus = "supported" | "weak" | "unsupported";

export type CitationCheck = {
  citation: string;
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
