import { parseLocation } from "@git-investigator/core/collect/parse-location";
import type { DigResult, InvestigateInput } from "@git-investigator/core/types";

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
