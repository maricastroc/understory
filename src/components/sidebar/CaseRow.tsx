import { Close } from "../icons";
import type { CaseItem } from "./case-item";

export function CaseRow({
  item,
  active,
  onSelect,
  onRemove,
}: {
  item: CaseItem;
  active: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const dot =
    !item.hasNarrative || !item.answerable ? "bg-ink-3" : item.recorded ? "bg-good" : "bg-warn";

  return (
    <div
      className={`group relative rounded-md transition-colors ${
        active ? "bg-accent-tint" : "hover:bg-inset"
      }`}
    >
      {active && <span className="absolute inset-y-2 -left-1 w-0.5 rounded bg-accent" />}
      <button
        onClick={() => onSelect(item.caseId)}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr] gap-2.5 rounded-md px-2.5 py-2 text-left"
      >
        <span className={`mt-1.25 size-2 shrink-0 rounded-full ${dot}`} />
        <span className="min-w-0 pr-5">
          <span
            className={`line-clamp-2 text-[13px] leading-snug font-medium ${
              active ? "text-accent-press" : "text-ink"
            }`}
          >
            {item.question}
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-ink-2">
            {item.repoName} · {item.location}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
            {item.caseId}
            {!item.hasNarrative
              ? " · evidence only"
              : !item.answerable
                ? " · out of scope"
                : ` · ${item.recorded ? "resolved" : "inconclusive"} · ${Math.round(item.score * 100)}%`}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Remove investigation"
        onClick={() => onRemove(item.caseId)}
        className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-ink-3 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-line-2/70 hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Close className="size-3.5" />
      </button>
    </div>
  );
}
