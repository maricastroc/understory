import type { ViewArtifact, ViewClause } from "../model/types";
import { dayDate, displayId, reviewStateLabel } from "./artifact-copy";
import type { StatusTone } from "./types";

export function artifactStatus(
  a: ViewArtifact,
  clauses: ViewClause[],
): { text: string; tone: StatusTone } {
  if (a.verified) return { text: "✓ Quote found verbatim in source", tone: "evidence" };
  const citing = clauses.filter((c) => a.citedBy.includes(c.id));
  if (citing.length === 0) return { text: "Supporting · not cited by any clause", tone: "neutral" };
  if (citing.some((c) => c.audit === "unsupported")) {
    return { text: "Cited · not substantiated by its sources", tone: "neutral" };
  }
  if (citing.some((c) => c.audit === "weak"))
    return { text: "Cited · weak support", tone: "neutral" };
  if (citing.every((c) => c.audit === "unaudited"))
    return { text: "Cited · not audited", tone: "neutral" };
  return { text: "Cited · the verbatim quote is in another source", tone: "neutral" };
}

export function citesText(a: ViewArtifact, clauses: ViewClause[]): string {
  const numbers = clauses
    .filter((c) => a.citedBy.includes(c.id))
    .map((c) => `clause ${c.index + 1}`);
  if (numbers.length === 0) return "Not cited by any clause";
  if (numbers.length === 1) return `Supports ${numbers[0]}`;
  return `Supports ${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`;
}

export function metaLine(a: ViewArtifact, all: ViewArtifact[]): string {
  const author = a.source.author?.name;
  const parent = a.parentId ? all.find((x) => x.id === a.parentId) : undefined;
  if (a.kind === "commit") {
    const pr = all.find((x) => x.parentId === a.id && x.kind === "pull_request");
    return [author, pr ? `merged via ${displayId(pr)}` : null].filter(Boolean).join(" · ");
  }
  if (a.kind === "review")
    return [author, parent ? `on ${displayId(parent)}` : null].filter(Boolean).join(" ");
  if (a.kind === "pull_request") {
    const reviews = all.filter((x) => x.parentId === a.id && x.kind === "review").length;
    return [author, reviews ? `${reviews} review${reviews === 1 ? "" : "s"} with text` : null]
      .filter(Boolean)
      .join(" · ");
  }
  return author ?? "";
}

export function contextLines(a: ViewArtifact, all: ViewArtifact[]): string[] {
  const lines: string[] = [];
  const children = all.filter((x) => x.parentId === a.id);
  const parent = a.parentId ? all.find((x) => x.id === a.parentId) : undefined;
  if (a.kind === "commit") {
    const pr = children.find((x) => x.kind === "pull_request");
    if (pr) lines.push(`Merged through ${displayId(pr)}`);
    else if (a.prLookup === "none") lines.push("No pull request references this commit");
    else if (a.prLookup === "skipped")
      lines.push("Pull requests were not looked up for this commit");
    else if (a.prLookup === "failed") lines.push("The pull request lookup failed for this commit");
  }
  if (a.kind === "pull_request") {
    for (const issue of children.filter((x) => x.kind === "issue"))
      lines.push(`Closes ${displayId(issue)}`);
    if (a.endDate) lines.push(`Merged ${dayDate(a.endDate)}`);
    else lines.push("No merge date recorded");
    if (a.source.meta?.reviewLookup === "none") lines.push("No review on record");
  }
  if (a.kind === "issue" && parent) lines.push(`Closed by ${displayId(parent)}`);
  if (a.kind === "issue" && typeof a.source.meta?.state === "string") {
    lines.push(`State: ${String(a.source.meta.state).toLowerCase()}`);
  }
  if (a.kind === "review") {
    const state = reviewStateLabel(a.reviewState);
    if (state) lines.push(`Review state: ${state.toLowerCase()}`);
  }
  return lines;
}
