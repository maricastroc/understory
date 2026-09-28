import { StatusGlyph } from "./StatusGlyph";
import type { RailItem } from "./types";

export function CaseStrip({
  items,
  expanded,
  onOpen,
}: {
  items: RailItem[];
  expanded: boolean;
  onOpen: () => void;
}) {
  const current = items.find((item) => item.current);
  const label = `Show investigations, ${items.length}${current ? `. Open: ${current.title}` : ""}`;
  return (
    <div className="flex h-full justify-center bg-li-paper py-3 font-li-body">
      <button
        type="button"
        aria-label={label}
        aria-expanded={expanded}
        aria-haspopup="dialog"
        onClick={onOpen}
        className="flex w-11 cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded py-2 transition-colors hover:bg-li-neutral-200/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none"
      >
        <span aria-hidden className="flex flex-col items-center gap-0.5">
          <span className="flex flex-col gap-0.75">
            <span className="h-px w-3.5 bg-li-ink" />
            <span className="h-px w-3.5 bg-li-ink" />
            <span className="h-px w-3.5 bg-li-ink" />
          </span>
          <span className="font-li-mono text-[10.5px] text-li-text-subtle">{items.length}</span>
        </span>
        <span aria-hidden className="flex flex-col items-center gap-1">
          {items.map((item) => (
            <span
              key={`${item.kind}-${item.id}`}
              className={`flex size-7 justify-center rounded ${
                item.current ? "bg-li-datum-tint" : ""
              } ${item.child ? "pl-1.5" : ""}`}
            >
              <span className="flex pt-1">
                <StatusGlyph status={item.status} />
              </span>
            </span>
          ))}
        </span>
      </button>
    </div>
  );
}
