import type { ArtifactKind } from "@git-investigator/core/types";
import { shortAge } from "../format/age";
import type { ViewArtifact } from "../model/types";

const KIND: Record<ArtifactKind, string> = {
  commit: "commit",
  pull_request: "pull request",
  review: "review",
  issue: "issue",
};

const REVIEW_STATE: Record<string, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  DISMISSED: "Dismissed",
  PENDING: "Pending",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export function kindName(kind: ArtifactKind): string {
  return KIND[kind];
}

export function displayId(a: ViewArtifact): string {
  if (a.kind === "commit") return a.source.ref ?? a.id.replace(/^commit:/, "");
  if (a.kind === "review" && a.source.author?.name) return `review·${a.source.author.name}`;
  return a.id;
}

export function reviewStateLabel(state: string | null): string | null {
  return state ? (REVIEW_STATE[state] ?? state.toLowerCase().replace(/_/g, " ")) : null;
}

export function labelTitle(a: ViewArtifact): string {
  return (a.kind === "review" ? reviewStateLabel(a.reviewState) : null) ?? a.title;
}

export function dateLine(a: ViewArtifact): string {
  if (a.kind !== "pull_request") return dayDate(a.date);
  if (!a.endDate) return `opened ${dayDate(a.date)}`;
  const [open, merged] = [dayDate(a.date), dayDate(a.endDate)];
  const sameYear = a.date.slice(0, 4) === a.endDate.slice(0, 4);
  const sameMonth = sameYear && a.date.slice(5, 7) === a.endDate.slice(5, 7);
  if (sameMonth) return `open ${open.split(" ")[0]} → ${merged}`;
  if (sameYear) return `open ${open.split(" ").slice(0, 2).join(" ")} → ${merged}`;
  return `open ${open} → ${merged}`;
}

export function depthText(days: number | null): string {
  return days === null ? "undated" : `−${shortAge(days)}`;
}

export function tickText(days: number): string {
  const years = days / 365.25;
  if (years >= 1) return `−${years.toFixed(1)}y`;
  if (days >= 30.44) return `−${Math.floor(days / 30.44)}m`;
  return `−${Math.floor(days)}d`;
}
