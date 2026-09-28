import type { ViewArtifact, ViewClause, ViewGap } from "../model/types";
import { dateLine, displayId, kindName } from "./artifact-copy";

function clauseList(ids: string[], clauses: ViewClause[]): string {
  const numbers = clauses.filter((c) => ids.includes(c.id)).map((c) => c.index + 1);
  if (numbers.length === 0) return "not cited by any clause";
  if (numbers.length === 1) return `cited by clause ${numbers[0]}`;
  return `cited by clause ${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`;
}

export function artifactName(a: ViewArtifact, clauses: ViewClause[]): string {
  const parts = [
    a.letter,
    `${kindName(a.kind)} ${displayId(a)}`,
    dateLine(a),
    clauseList(a.citedBy, clauses),
  ];
  if (a.verified) parts.push("quote verified");
  return parts.join(", ");
}

export function gapName(gap: ViewGap, after: ViewArtifact): string {
  const target = `${kindName(after.kind)} ${displayId(after)}`;
  const text =
    gap.missing === "pull_request"
      ? `no pull request, review or issue before ${target}`
      : gap.missing === "reason"
        ? `no recorded reason for ${target}`
        : gap.missing === "review"
          ? `no review on ${target}`
          : `no linked issue on ${target}`;
  const prefix = !gap.verified ? "Not verified" : gap.missing === "issue" ? null : "Not recorded";
  return prefix ? `${prefix}: ${text}` : text.charAt(0).toUpperCase() + text.slice(1);
}
