import type { TargetHunk } from "@git-investigator/core/diff/types";

export type HunkRow =
  { kind: "del" | "add"; n: number | null; text: string } | { kind: "more"; n: null; text: string };

const MAX_REMOVED = 4;

export function hunkRows(hunk: TargetHunk): HunkRow[] {
  const rows: HunkRow[] = [];
  let dels = 0;
  let adds = 0;
  for (const line of hunk.lines) {
    if (line.kind === "del") {
      if (dels >= MAX_REMOVED) continue;
      dels++;
      rows.push({ kind: "del", n: line.old, text: line.text });
    } else {
      adds++;
      rows.push({ kind: "add", n: line.new, text: line.text });
    }
  }
  const moreRemoved = hunk.removed - dels;
  const moreAdded = hunk.added - adds;
  if (moreRemoved + moreAdded > 0) {
    rows.push({
      kind: "more",
      n: null,
      text:
        moreAdded === 0
          ? `⋯ ${moreRemoved} more removed line${moreRemoved === 1 ? "" : "s"}`
          : `⋯ ${moreRemoved + moreAdded} more lines`,
    });
  }
  return rows;
}
