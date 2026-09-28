import { useId } from "react";
import { CaseRailRow } from "./CaseRailRow";
import { RailFooter } from "./RailFooter";
import type { RailFooterInfo, RailItem } from "./types";

export function CaseRail({
  items,
  onSelect,
  onRemove,
  footer,
  onClose,
  onNew,
}: {
  items: RailItem[];
  onSelect: (item: RailItem) => void;
  onRemove?: (item: RailItem) => void;
  footer: RailFooterInfo;
  onClose?: () => void;
  onNew?: () => void;
}) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="flex h-full flex-col bg-li-paper font-li-body">
      <div className="flex h-12 items-center gap-2 px-4">
        <h2 id={headingId} className="li-eyebrow text-li-ink">
          Investigations
        </h2>
        {items.length > 0 && (
          <span className="font-li-mono text-[11px] text-li-text-subtle tnum">{items.length}</span>
        )}
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            aria-label="New investigation"
            className="-mr-1.5 ml-auto grid size-7 cursor-pointer place-items-center text-[18px] leading-none font-light text-li-ink transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-li-focus active:bg-li-neutral-300 motion-reduce:transition-none"
          >
            +
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close investigations"
            className={`-mr-1.5 grid size-7 cursor-pointer place-items-center text-li-ink transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-li-focus motion-reduce:transition-none ${onNew ? "ml-1" : "ml-auto"}`}
          >
            ✕
          </button>
        )}
      </div>
      <nav aria-label="Case list" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {items.length === 0 ? (
          <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 px-2 pt-3">
            <svg
              aria-hidden
              width="24"
              height="64"
              viewBox="0 0 24 64"
              className="overflow-visible"
            >
              <line x1="0" x2="24" y1="3" y2="3" strokeWidth="2" className="stroke-li-datum" />
              <line
                x1="12"
                x2="12"
                y1="3"
                y2="50"
                strokeWidth="2"
                strokeDasharray="3 3"
                className="stroke-li-neutral-500"
              />
              <circle
                cx="12"
                cy="56"
                r="5"
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
                className="fill-li-paper stroke-li-neutral-500"
              />
            </svg>
            <div className="flex flex-col gap-1.5 pt-0.5">
              <p className="text-[14px] font-medium text-li-ink">No investigations yet.</p>
              <p className="text-[12.5px] leading-snug text-li-neutral-800">
                Each line you investigate stays here, with the trail it followed.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-px">
            {items.map((item) => (
              <CaseRailRow key={item.id} item={item} onSelect={onSelect} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </nav>
      <RailFooter info={footer} />
    </aside>
  );
}
