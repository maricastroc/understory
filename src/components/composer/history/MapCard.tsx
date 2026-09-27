import type { MapCore } from "./types";

export function MapCard({
  core,
  left,
  top,
  facts,
  why,
  note,
}: {
  core: MapCore;
  left: number;
  top: number;
  facts: string;
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
      <div className="flex flex-col gap-0.75 border-t border-li-divider pt-2 text-xs text-li-neutral-700">
        <span>{why}</span>
        <span>{note}</span>
      </div>
    </div>
  );
}
