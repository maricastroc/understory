import type { InvestigateInput } from "@git-investigator/core/types";
import type { CaseParent } from "./case-parent";

export type CaseDraft = {
  key: string;
  form: InvestigateInput;
  parent?: CaseParent;
  error: string | null;
};
