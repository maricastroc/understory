import { parseLocation } from "@understory/core/collect/parse-location";
import type { DigResult, InvestigateInput } from "@understory/core/types";

export function draftResult(form: InvestigateInput): DigResult | null {
  if (!form.location) return null;
  try {
    return {
      evidence: {
        question: form.question,
        repo: { path: form.repoPath },
        location: parseLocation(form.location),
        artifacts: [],
        contradictions: [],
      },
      narrative: null,
    };
  } catch {
    return null;
  }
}
