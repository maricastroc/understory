import type { PrRegion, RegionState } from "../model/types";

const HATCH = "repeating-linear-gradient(135deg, var(--color-li-gap) 0 1px, transparent 1px 3px)";

export function RegionCell({ state, height = 12 }: { state: RegionState; height?: number }) {
  if (state === "silent") {
    return (
      <span
        className="w-1 border border-dashed border-li-gap"
        style={{ height, background: HATCH }}
      />
    );
  }
  if (state === "partial") {
    return (
      <span className="flex w-1 flex-col border border-li-evidence" style={{ height }}>
        <span className="flex-1 bg-li-evidence" />
        <span className="flex-1" style={{ background: HATCH }} />
      </span>
    );
  }
  if (state === "unexplained") {
    return <span className="w-1 border border-li-neutral-500" style={{ height }} />;
  }
  return <span className="w-1 border border-li-evidence bg-li-evidence" style={{ height }} />;
}

export function RegionCells({ regions }: { regions: PrRegion[] }) {
  return (
    <span className="flex items-end gap-0.5">
      {regions.map((r) => (
        <RegionCell key={r.id} state={r.state} />
      ))}
    </span>
  );
}
