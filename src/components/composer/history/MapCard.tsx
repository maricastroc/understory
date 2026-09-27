import { HATCH } from "../../line-investigation/parts/hatch";
import type { CoreHistory, MapCore } from "./types";

function Bar({ history }: { history: CoreHistory }) {
  const total = history.shares.found + history.shares.none + history.shares.unknown || 1;
  const width = (n: number) => `${(100 * n) / total}%`;
  return (
    <span className="flex h-2 gap-px">
      {history.shares.found > 0 && (
        <span
          className="border border-li-evidence-edge bg-li-evidence-tint"
          style={{ width: width(history.shares.found) }}
        />
      )}
      {history.shares.none > 0 && (
        <span
          className="border border-dashed border-li-gap"
          style={{ width: width(history.shares.none), background: HATCH }}
        />
      )}
      {history.shares.unknown > 0 && (
        <span
          className="border border-li-neutral-500"
          style={{ width: width(history.shares.unknown) }}
        />
      )}
    </span>
  );
}

export function MapCard({
  core,
  left,
  top,
  facts,
  history,
  shares,
  why,
  note,
}: {
  core: MapCore;
  left: number;
  top: number;
  facts: string;
  history: CoreHistory | null;
  shares: string | null;
  why: string;
  note: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 flex w-70 flex-col gap-2.25 border border-li-divider bg-li-paper px-3.5 py-3 shadow-li-md"
      style={{ left, top }}
    >
      <p className="font-li-mono text-[12.5px] text-li-ink">
        <span className="text-li-neutral-700">{core.dir}</span>
        {core.name}
      </p>
      <p className="text-[12.5px] leading-[1.4] text-li-neutral-800">{facts}</p>
      {history && <Bar history={history} />}
      {shares && <p className="font-li-mono text-[11px] text-li-neutral-700">{shares}</p>}
      <div className="flex flex-col gap-0.75 border-t border-li-divider pt-2 text-xs text-li-neutral-700">
        <span>{why}</span>
        <span>{note}</span>
      </div>
    </div>
  );
}
