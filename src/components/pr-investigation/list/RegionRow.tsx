import type { KeyboardEvent } from "react";
import { deltaText, rangeText, regionName } from "../copy/region-copy";
import type { PrRegion } from "../model/types";
import { RegionToken } from "../parts/RegionToken";
import { HunkView } from "./HunkView";

export function RegionRow({
  region,
  selected,
  lit,
  dim,
  tabIndex,
  onPick,
  onHover,
  onKeyDown,
  buttonRef,
}: {
  region: PrRegion;
  selected: boolean;
  lit: boolean;
  dim: boolean;
  tabIndex: number;
  onPick: () => void;
  onHover: (id: string | null) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const hunkId = `hunk-${region.id}`;
  const expanded = selected && region.hunk !== null;
  const delta = deltaText(region);
  return (
    <li className="border-b border-li-divider last:border-b-0">
      <button
        ref={buttonRef}
        type="button"
        tabIndex={tabIndex}
        aria-label={regionName(region)}
        aria-pressed={selected}
        aria-expanded={region.hunk ? selected : undefined}
        aria-controls={expanded ? hunkId : undefined}
        onClick={onPick}
        onMouseEnter={() => onHover(region.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(region.id)}
        onBlur={() => onHover(null)}
        onKeyDown={onKeyDown}
        className={`grid h-10.5 w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_64px] items-center gap-2.5 px-3.5 text-left transition-[opacity,background-color] duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none ${
          selected ? "bg-li-steel-100" : lit ? "bg-li-neutral-200" : "hover:bg-li-neutral-200"
        } ${dim ? "opacity-45" : ""}`}
      >
        <RegionToken id={region.id} state={region.state} selected={selected} className="w-8" />
        <span className="flex min-w-0 gap-1.5 font-li-mono text-xs whitespace-nowrap">
          <span className="min-w-0 truncate">
            <span className="text-li-text-subtle">{region.dir}</span>
            <span className="text-li-ink">{region.file}</span>
          </span>
          <span className="shrink-0 text-li-text-muted">{rangeText(region)}</span>
        </span>
        <span className="text-right font-li-mono text-[11px] text-li-text-subtle">{delta}</span>
      </button>
      {expanded && region.hunk && <HunkView id={hunkId} regionId={region.id} hunk={region.hunk} />}
    </li>
  );
}
