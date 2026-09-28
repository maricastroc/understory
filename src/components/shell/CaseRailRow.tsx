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
        className={`grid w-full cursor-pointer gap-2 border-l-2 px-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none ${
          item.child
            ? "grid-cols-[14px_14px_minmax(0,1fr)] gap-1.5 py-1.75"
            : "grid-cols-[14px_minmax(0,1fr)] py-2.25"
        } ${item.current ? "border-li-datum bg-li-datum-tint" : "border-transparent group-hover:border-li-neutral-400"}`}
      >
        {item.child && (
          <span aria-hidden className="ml-0.75 h-2.5 border-b border-l border-li-neutral-500" />
        )}
        <StatusGlyph status={item.status} />
        <span className="min-w-0 [@media(hover:none)]:pr-5">
          <span
            className={`block leading-[1.35] ${
              item.current ? "text-[13.5px] font-medium text-li-ink" : "text-[13px] text-li-ink"
            }`}
          >
            {item.title}
          </span>
          <span
            className={`mt-0.5 block truncate font-li-mono text-[10.5px] ${
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
          className={`absolute top-1.5 right-1 grid size-5.5 cursor-pointer place-items-center text-li-text-subtle opacity-0 group-hover:opacity-100 hover:text-li-ink ${
            item.current ? "bg-li-datum-tint" : "bg-li-paper"
          } focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-li-steel [@media(hover:none)]:opacity-100`}
        >
          ✕
        </button>
      )}
    </li>
  );
}
