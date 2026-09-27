import type { InvestigationView } from "../model/types";
import type { EvidenceEntry } from "./types";

export function evidenceEntries(view: InvestigationView): EvidenceEntry[] {
  const out: EvidenceEntry[] = [];
  for (const artifact of view.artifacts) {
    out.push({ id: artifact.id, type: "artifact", artifact });
    for (const gap of view.gaps.filter((g) => g.afterId === artifact.id)) {
      out.push({ id: gap.id, type: "gap", gap, after: artifact });
    }
  }
  return out;
}
