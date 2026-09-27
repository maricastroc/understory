import { liButton } from "../../line-investigation/parts/button-class";

export function MapHeader({
  titleId,
  scope,
  mapped,
  moreLabel,
  onMapMore,
}: {
  titleId: string;
  scope: string;
  mapped: string;
  moreLabel: string | null;
  onMapMore: (() => void) | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-li-ink pt-3 text-[12.5px] text-li-neutral-800">
      <h2 id={titleId} className="font-semibold text-li-ink">
        History of current lines
      </h2>
      <p>{scope}</p>
      <span className="ml-auto font-li-mono text-[11.5px] text-li-neutral-700">{mapped}</span>
      {moreLabel && (
        <button
          type="button"
          onClick={onMapMore ?? undefined}
          disabled={!onMapMore}
          className={liButton("ghost", "px-2 py-0.75 text-[12.5px]")}
        >
          {moreLabel}
        </button>
      )}
    </div>
  );
}
