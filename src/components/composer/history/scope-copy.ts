import type { ShownReason, TreeOverview } from "@git-investigator/core/types";

const count = (n: number) => n.toLocaleString("en-US");

function tally(files: TreeOverview["files"], reason: ShownReason): number {
  return files.filter((f) => f.reason === reason).length;
}

export function scopeWhy(overview: TreeOverview, counted: boolean): string {
  const files = overview.files;
  const recent = tally(files, "recent");
  const cases = tally(files, "case");
  const path = tally(files, "path");
  const commits = `the last ${overview.recentCommits} commits`;
  const reasons = [recent, cases, path].filter(Boolean).length;
  if (!counted && reasons === 1) {
    if (recent) return `Changed in ${commits}`;
    if (cases) return "Where you have cases";
    return "Picked by path";
  }
  const parts: string[] = [];
  if (recent) parts.push(`${recent} changed in ${commits}`);
  if (cases) parts.push(`${cases} with your cases`);
  if (path) parts.push(`${path} picked by path`);
  return parts.join(" · ");
}

export function scopeAbout(overview: TreeOverview): string {
  const total = `${overview.truncated ? "≥" : ""}${count(overview.total)}`;
  return `${overview.files.length} of ${total} files at HEAD, chosen for the reasons above. Not a sample of the whole repository.`;
}

export function whyShown(reason: ShownReason, recentCommits: number): string {
  if (reason === "case") return "Shown because you have cases here.";
  if (reason === "recent") return `Shown because it changed in the last ${recentCommits} commits.`;
  return "Shown because its path looks like a main source file.";
}

export function mappedLine(mapped: number, total: number, mapping: number): string {
  return `${mapped} of ${total} mapped${mapping ? ` · mapping ${mapping}` : ""}`;
}
