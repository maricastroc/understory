import type { ViewArtifact, ViewGap } from "../model/types";
import { displayId } from "./artifact-copy";

export function gapLetter(gap: ViewGap): string {
  return gap.verified ? "∅" : "?";
}

export function gapLabel(gap: ViewGap): string {
  if (!gap.verified) return "not verified";
  return gap.missing === "issue" ? "no linked issue" : "not recorded";
}

export function isReasonGap(gap: ViewGap): boolean {
  return gap.missing === "reason";
}

export function gapKind(gap: ViewGap): string {
  return gap.verified ? "NOT RECOVERED" : "NOT VERIFIED";
}

export function gapTitle(gap: ViewGap): string {
  if (gap.missing === "pull_request") return "No pull request, review or issue";
  if (gap.missing === "reason") return "No recorded reason";
  if (gap.missing === "review") return "No review on the pull request";
  return "No issue linked to the pull request";
}

export function gapId(gap: ViewGap, after: ViewArtifact): string {
  return gap.missing === "pull_request" || gap.missing === "reason"
    ? `before ${displayId(after)}`
    : `on ${displayId(after)}`;
}

const BASIS: Record<ViewGap["basis"], string> = {
  searched: "The provider was asked and has nothing on record.",
  skipped: "This commit was not looked up (outside the enrichment limit, or no supported remote).",
  failed: "The lookup failed, so nothing is known about what exists.",
  unknown: "This case was saved before lookups were tracked, so absence cannot be confirmed.",
  silent:
    "The investigation read the collected history for this region and found no recorded reason.",
};

export function gapBasis(gap: ViewGap): string {
  return BASIS[gap.basis];
}

export function gapBody(gap: ViewGap, after: ViewArtifact): string {
  const id = displayId(after);
  if (!gap.verified) {
    return `Nothing is shown before ${id}, but this was not verified. Git Investigator does not treat it as silence.`;
  }
  if (gap.missing === "pull_request") {
    return `Blame reaches ${id}, but no pull request, review or issue explains it. Git Investigator does not infer a reason here.`;
  }
  if (gap.missing === "reason") {
    return `The history collected down to ${id} does not say why this code exists. Git Investigator does not infer a reason here.`;
  }
  if (gap.missing === "review") {
    return `${id} was merged without a recorded review. Git Investigator does not infer what a review would have said.`;
  }
  return `${id} closes no issue by a closing keyword. An issue may still be mentioned elsewhere.`;
}

export function gapStatus(gap: ViewGap): string {
  return gap.verified ? "History silent · recorded: false" : "Not verified · absence not confirmed";
}
