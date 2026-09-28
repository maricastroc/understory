import { regionName } from "../copy/region-copy";
import type { PrView } from "../model/types";
import { RegionToken } from "../parts/RegionToken";
import { HunkView } from "./HunkView";

export function RegionStrip({
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
  const region = view.regions.find((r) => r.id === selected);
  return (
    <section aria-label="Changed regions" className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {view.regions.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              aria-label={regionName(r)}
              aria-pressed={selected === r.id}
              onClick={() => onPick(r.id)}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(r.id)}
              onBlur={() => onHover(null)}
              className={`cursor-pointer p-0.5 focus-visible:outline-2 focus-visible:outline-li-focus ${
                active && !active.has(r.id) ? "opacity-45" : ""
              }`}
            >
              <RegionToken id={r.id} state={r.state} selected={selected === r.id} />
            </button>
          </li>
        ))}
      </ul>
      {region?.hunk && (
        <div className="border border-li-divider bg-li-neutral-100">
          <div className="px-3 pt-2 font-li-mono text-[11px] text-li-text-subtle">
            {region.path}
          </div>
          <HunkView id={`hunk-strip-${region.id}`} regionId={region.id} hunk={region.hunk} />
        </div>
      )}
    </section>
  );
}
