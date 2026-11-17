import type { ViewClause, ViewGap } from "../../../line-investigation/model/types";
import type { LineRange } from "../../../line-investigation/specimen/types";
import type { DigRecord } from "./dig-record";

export type DigModel = {
  path: string;
  line: number;
  code: string;
  indent: number;
  token: LineRange | null;
  column: number;
  question: string;
  first: DigRecord;
  trail: DigRecord[];
  proof: DigRecord;
  origin: DigRecord;
  gap: ViewGap;
  unchangedDays: number;
  silentDays: number;
  silentMonths: string[];
  clauses: ViewClause[];
  quoted: Array<{ letter: string; text: string }>;
};
