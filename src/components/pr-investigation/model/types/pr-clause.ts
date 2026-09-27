import type { ViewClause } from "../../../line-investigation/model/types";

export type PrClause = ViewClause & { regions: string[]; derived: boolean };
