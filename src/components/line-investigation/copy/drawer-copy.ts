import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
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

export function metaLine(a: ViewArtifact, all: ViewArtifact[], locale: Locale): string {
  const d = messagesFor(locale).drawer;
  const author = a.source.author?.name;
  const parent = a.parentId ? all.find((x) => x.id === a.parentId) : undefined;
  if (a.kind === "commit") {
    const pr = all.find((x) => x.parentId === a.id && x.kind === "pull_request");
    return [author, pr ? d.mergedVia(displayId(pr)) : null].filter(Boolean).join(" · ");
  }
  if (a.kind === "review")
    return [author, parent ? d.reviewOn(displayId(parent)) : null].filter(Boolean).join(" ");
  if (a.kind === "pull_request") {
    const reviews = all.filter((x) => x.parentId === a.id && x.kind === "review").length;
    return [author, reviews ? d.reviewsWithText(reviews) : null].filter(Boolean).join(" · ");
  }
  return author ?? "";
}

export function contextLines(a: ViewArtifact, all: ViewArtifact[], locale: Locale): string[] {
  const d = messagesFor(locale).drawer;
  const lines: string[] = [];
  const children = all.filter((x) => x.parentId === a.id);
  const parent = a.parentId ? all.find((x) => x.id === a.parentId) : undefined;
  if (a.kind === "commit") {
    const pr = children.find((x) => x.kind === "pull_request");
    if (pr) lines.push(d.mergedThrough(displayId(pr)));
    else if (a.prLookup === "none") lines.push(d.noPrRefs);
    else if (a.prLookup === "skipped") lines.push(d.prsNotLooked);
    else if (a.prLookup === "failed") lines.push(d.prLookupFailed);
  }
  if (a.kind === "pull_request") {
    for (const issue of children.filter((x) => x.kind === "issue"))
      lines.push(d.closes(displayId(issue)));
    if (a.endDate) lines.push(d.merged(dayDate(a.endDate, locale)));
    else lines.push(d.noMergeDate);
    if (a.source.meta?.reviewLookup === "none") lines.push(d.noReview);
  }
  if (a.kind === "issue" && parent) lines.push(d.closedBy(displayId(parent)));
  if (a.kind === "issue" && typeof a.source.meta?.state === "string") {
    const state = String(a.source.meta.state).toLowerCase();
    lines.push(d.state((d.issueState as Record<string, string>)[state] ?? state));
  }
  if (a.kind === "review") {
    const state = reviewStateLabel(a.reviewState, locale);
    if (state) lines.push(d.reviewState(state.toLowerCase()));
  }
  return lines;
}
