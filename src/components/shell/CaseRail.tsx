import { useId } from "react";
import { CaseRailRow } from "./CaseRailRow";
import { RailFooter } from "./RailFooter";
import { SegmentedFilter } from "./SegmentedFilter";
import type { RailFilter, RailFooterInfo, RailItem } from "./types";

const FILTERS: Array<{ value: RailFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "lines", label: "Lines" },
  { value: "prs", label: "PRs" },
];

const EMPTY: Record<RailFilter, string> = {
  all: "No cases yet. Pick a line or paste a pull request to start one.",
  lines: "No line cases yet.",
  prs: "No pull requests explained yet.",
};

export function CaseRail({
  items,
  filter,
  onFilter,
  onSelect,
  onRemove,
  footer,
  onClose,
}: {
  items: RailItem[];
  filter: RailFilter;
  onFilter: (filter: RailFilter) => void;
  onSelect: (item: RailItem) => void;
  onRemove?: (item: RailItem) => void;
  footer: RailFooterInfo;
  onClose?: () => void;
}) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="flex h-full flex-col bg-li-paper font-li-body">
      <div className="flex items-center px-4 pt-4.5 pb-2.5">
        <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
          Cases
        </h2>
        <span className="ml-auto font-li-mono text-[11px] text-li-text-subtle">{items.length}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cases"
            className="-my-1 -mr-1.5 ml-2 grid size-7 cursor-pointer place-items-center rounded text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-li-steel"
          >
            ✕
          </button>
        )}
      </div>
      <SegmentedFilter label="Show cases" options={FILTERS} value={filter} onChange={onFilter} />
      <nav aria-label="Case list" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-li-text-subtle">{EMPTY[filter]}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <CaseRailRow
                key={`${item.kind}-${item.id}`}
                item={item}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </nav>
      <RailFooter info={footer} />
    </aside>
  );
}
