import type { TrailSlot } from "./types/trail-slot";

const BASE =
  "flex h-6.5 max-w-70 items-center gap-1.5 overflow-hidden rounded-[3px] border px-2.25 font-li-mono text-xs whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none";

function tone(slot: TrailSlot): string {
  if (slot.filled) {
    return `cursor-pointer border-li-divider text-li-ink ${
      slot.tone === "datum" ? "bg-li-datum-strong" : "hover:bg-li-neutral-200"
    }`;
  }
  if (slot.current) return "cursor-pointer border-li-steel bg-li-steel-100 text-li-steel-800";
  return "cursor-default border-dashed border-li-neutral-400 text-li-text-muted";
}

export function SetupTrail({ slots }: { slots: TrailSlot[] }) {
  return (
    <nav aria-label="Investigation setup">
      <ol className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot, i) => (
          <li key={slot.key} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-[11px] text-li-neutral-500">
                →
              </span>
            )}
            <button
              type="button"
              onClick={slot.onPick}
              disabled={!slot.enabled}
              aria-current={slot.current ? "step" : undefined}
              className={`${BASE} ${tone(slot)}`}
            >
              {slot.dot && slot.filled && (
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-li-evidence" />
              )}
              <span className="truncate">{slot.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
