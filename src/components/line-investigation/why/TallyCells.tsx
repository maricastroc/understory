import type { TallyState, ViewClause } from "../model/types";
import { HATCH_WIDE } from "../parts/hatch";

const CELL: Record<TallyState, string> = {
  verified: "border-li-evidence bg-li-evidence",
  cited: "border-li-neutral-400 bg-li-neutral-400",
  weak: "border-li-neutral-400 bg-li-neutral-400",
  misattributed: "border-li-neutral-400",
  unaudited: "border-dashed border-li-neutral-500",
  unknown: "border-li-ink",
};

export function TallyCells({ clause }: { clause: ViewClause }) {
  if (clause.silent) {
    return (
      <span className="flex gap-0.5">
        <span
          className="h-2 w-3.5 border border-dashed border-li-gap"
          style={{ background: HATCH_WIDE }}
        />
      </span>
    );
  }
  return (
    <span className="flex gap-0.5">
      {clause.cells.map((cell) => (
        <span
          key={cell.citation}
          data-cell={cell.state}
          className={`h-2 w-3.5 border ${CELL[cell.state]}`}
        />
      ))}
    </span>
  );
}
