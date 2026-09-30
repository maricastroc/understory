import type { ClauseSlot } from "./clause-slot";
import type { StrataBreak } from "./strata-break";
import type { Stratum } from "./stratum";

export type StrataLayout = {
  strata: Stratum[];
  breaks: StrataBreak[];
  clauses: ClauseSlot[];
  origin: number;
  bottom: number;
};
