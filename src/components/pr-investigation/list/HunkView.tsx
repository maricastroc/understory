import type { TargetHunk } from "@git-investigator/core/diff/types";
import { hunkRows } from "./hunk-rows";

const ROW = {
  del: "bg-li-neutral-200 text-li-neutral-800",
  add: "bg-li-paper text-li-ink shadow-[inset_2px_0_0_var(--color-li-ink)]",
  more: "text-li-text-muted",
} as const;

const MARK = { del: "−", add: "+", more: "" } as const;

export function HunkView({
  id,
  regionId,
  hunk,
}: {
  id: string;
  regionId: string;
  hunk: TargetHunk;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-label={`Diff for ${regionId}`}
      className="bg-li-paper pt-1.5 pb-2.5 font-li-mono text-[11.5px]"
    >
      {hunkRows(hunk).map((row, i) => (
        <div key={i} className={`flex h-5.5 items-center ${ROW[row.kind]}`}>
          <span className="w-8.5 shrink-0 text-right text-li-text-muted">{row.n ?? "⋯"}</span>
          <span aria-hidden className="w-4 shrink-0 text-center text-li-text-muted">
            {MARK[row.kind]}
          </span>
          <span className="sr-only">
            {row.kind === "del" ? "removed" : row.kind === "add" ? "added" : ""}
          </span>
          <span className="min-w-0 truncate pr-3 whitespace-pre">
            {row.kind === "more" ? row.text.replace(/^⋯ /, "") : row.text}
          </span>
        </div>
      ))}
    </div>
  );
}
