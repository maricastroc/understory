import type { InvestigateInput } from "@understory/core/types";
import type { ApiFailure } from "@/lib/api-error";
import type { CaseParent } from "./case-parent";

export type CaseDraft = {
  key: string;
  form: InvestigateInput;
  parent?: CaseParent;
  error: ApiFailure | null;
};
