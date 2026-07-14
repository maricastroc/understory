import type { DiffResult } from "@git-investigator/core/diff/types";
import { Close } from "../icons";
import type { PrEntry } from "./pr-entry";

function dotColor(r: DiffResult): string {
  if (r.findings.length === 0) return "bg-ink-3";
  return r.findings.some((f) => f.recorded && f.grounded) ? "bg-good" : "bg-warn";
}

export function PrRow({
  entry,
  active,
  onSelect,
  onRemove,
}: {
  entry: PrEntry;
  active: boolean;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const r = entry.result;
  const regions = r.triage.clustersDetailed;

  return (
    <div
      className={`group relative rounded-md transition-colors ${
        active ? "bg-accent-tint" : "hover:bg-inset"
      }`}
    >
      {active && <span className="absolute inset-y-2 -left-1 w-0.5 rounded bg-accent" />}
      <button
        onClick={() => onSelect(entry.key)}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr] gap-2.5 rounded-md px-2.5 py-2 text-left"
      >
        <span className={`mt-1.25 size-2 shrink-0 rounded-full ${dotColor(r)}`} />
        <span className="min-w-0 pr-5">
          <span
            className={`line-clamp-2 text-[13px] leading-snug font-medium ${
              active ? "text-accent-press" : "text-ink"
            }`}
          >
            {r.pr.title}
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-ink-2">
            {r.repo.name ?? r.repo.path} · #{r.pr.number}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
            {regions} region{regions === 1 ? "" : "s"} explained
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Remove analysis"
        onClick={() => onRemove(entry.key)}
        className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-line-2/70 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Close className="size-3.5" />
      </button>
    </div>
  );
}
