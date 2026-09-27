import type { ClaimAudit } from "./claim-audit";
import type { TallyCell } from "./tally-cell";

export type ViewClause = {
  id: string;
  index: number;
  text: string;
  silent: boolean;
  legacy: boolean;
  grounded: boolean;
  audit: ClaimAudit;
  citations: string[];
  letters: string[];
  unknownCitations: string[];
  cells: TallyCell[];
};
