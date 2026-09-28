import { StatusGlyph } from "./StatusGlyph";
import type { RailItem } from "./types";

const STATUS_LABEL = {
  resolved: "resolved",
  silent: "not recorded",
  "evidence-only": "evidence only",
  "out-of-scope": "out of scope",
  fabrication: "fabrication caught",
  pending: "reconstructing",
  pr: "pull request",
} as const;

export function CaseRailRow({
  item,
  onSelect,
  onRemove,
}: {
  item: RailItem;
  onSelect: (item: RailItem) => void;
  onRemove?: (item: RailItem) => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        aria-current={item.current ? "page" : undefined}
        onClick={() => onSelect(item)}
        className={`grid w-full cursor-pointer border-l-2 py-2 pr-7 pl-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none ${
          item.child
            ? "grid-cols-[14px_14px_minmax(0,1fr)] gap-1.5"
            : "grid-cols-[14px_minmax(0,1fr)] gap-2"
        } ${
          item.current
            ? "border-li-datum bg-li-datum-tint"
            : "border-transparent group-hover:bg-li-neutral-200/60 active:bg-li-neutral-200"
        }`}
      >
        {item.child && (
          <span aria-hidden className="ml-0.75 h-2.5 border-b border-l border-li-neutral-500" />
        )}
        <StatusGlyph status={item.status} />
        <span className="min-w-0">
          <span className="line-clamp-2 block text-[13px] leading-[1.35] text-li-ink">
            {item.title}
          </span>
          <span
            className={`mt-1 block truncate font-li-mono text-[11px] tnum ${
              item.current ? "text-li-datum-ink" : "text-li-text-subtle"
            }`}
          >
            <span className="sr-only">{STATUS_LABEL[item.status]} · </span>
            {item.subline}
          </span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove “${item.title}”`}
          onClick={() => onRemove(item)}
          className="absolute top-1.5 right-1 grid size-6 cursor-pointer place-items-center text-[11px] text-li-text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-li-neutral-300/60 hover:text-li-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        >
          ✕
        </button>
      )}
    </li>
  );
}
