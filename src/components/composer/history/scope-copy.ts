import type { ShownReason, TreeOverview } from "@git-investigator/core/types";

const count = (n: number) => n.toLocaleString("en-US");

function tally(files: TreeOverview["files"], reason: ShownReason): number {
  return files.filter((f) => f.reason === reason).length;
}

export function scopeLine(overview: TreeOverview): string {
  const files = overview.files;
  const total = `${overview.truncated ? "≥" : ""}${count(overview.total)}`;
  const parts: string[] = [];
  const recent = tally(files, "recent");
  const cases = tally(files, "case");
  const path = tally(files, "path");
  if (recent) parts.push(`${recent} changed in the last ${overview.recentCommits} commits`);
  if (cases) parts.push(`${cases} with your cases`);
  if (path) parts.push(`${path} picked by path`);
  const why = parts.length ? `: ${parts.join(", ")}` : "";
  return `${files.length} of ${total} files${why}. Not a sample of the whole repository.`;
}

export function whyShown(reason: ShownReason, recentCommits: number): string {
  if (reason === "case") return "Shown because you have cases here.";
  if (reason === "recent") return `Shown because it changed in the last ${recentCommits} commits.`;
  return "Shown because its path looks like a main source file.";
}

export function mappedLine(mapped: number, total: number, mapping: number): string {
  return `${mapped} of ${total} mapped${mapping ? ` · mapping ${mapping}` : ""}`;
}
