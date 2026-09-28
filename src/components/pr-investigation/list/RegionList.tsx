import { type KeyboardEvent, useRef, useState } from "react";
import type { PrView } from "../model/types";
import { RegionRow } from "./RegionRow";

export function RegionList({
  view,
  selected,
  active,
  onPick,
  onHover,
}: {
  view: PrView;
  selected: string | null;
  active: Set<string> | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [focusIndex, setFocusIndex] = useState(0);
  const regions = view.regions;
  const count = view.triage.truncated
    ? `${regions.length} of ${Math.max(view.triage.targetsBlamed, regions.length)} regions`
    : `${regions.length} in ${view.files} file${view.files === 1 ? "" : "s"}`;
  const totals =
    view.added !== null && view.removed !== null ? `+${view.added} −${view.removed}` : null;
  const partial = active !== null && active.size < regions.length;

  const move = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(
      regions.length - 1,
      Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)),
    );
    setFocusIndex(next);
    buttons.current.get(regions[next].id)?.focus();
  };

  return (
    <section
      aria-label="Changed regions"
      className="border border-li-divider bg-li-neutral-100 shadow-li-sm"
    >
      <div className="flex h-9 items-center gap-2.5 border-b border-li-divider px-3.5 text-xs">
        <h2 className="text-[13px] font-semibold text-li-ink">Changed regions</h2>
        <span className="font-li-mono text-li-text-subtle">{count}</span>
        {totals && (
          <span className="ml-auto font-li-mono text-[11px] text-li-text-subtle">{totals}</span>
        )}
      </div>
      <ul>
        {regions.map((r, i) => (
          <RegionRow
            key={r.key}
            region={r}
            selected={selected === r.id}
            lit={partial && active!.has(r.id)}
            dim={active !== null && !active.has(r.id)}
            tabIndex={i === focusIndex ? 0 : -1}
            onPick={() => {
              setFocusIndex(i);
              onPick(r.id);
            }}
            onHover={onHover}
            onKeyDown={(e) => move(e, i)}
            buttonRef={(el) => {
              if (el) buttons.current.set(r.id, el);
              else buttons.current.delete(r.id);
            }}
          />
        ))}
      </ul>
    </section>
  );
}
