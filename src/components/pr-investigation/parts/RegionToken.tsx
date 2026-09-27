import type { RegionState } from "../model/types";

const TONE: Record<RegionState, string> = {
  explained: "border-li-ink text-li-ink",
  partial: "border-li-ink text-li-ink",
  silent: "border-dashed border-li-gap text-li-gap-ink",
  unexplained: "border-li-neutral-500 text-li-text-muted",
};

export function RegionToken({
  id,
  state,
  selected = false,
  className = "",
}: {
  id: string;
  state: RegionState;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block border px-1 text-center font-li-mono text-[10.5px] leading-4 whitespace-nowrap ${
        selected ? "border-li-ink bg-li-ink text-li-paper" : TONE[state]
      } ${className}`}
    >
      {id}
    </span>
  );
}
