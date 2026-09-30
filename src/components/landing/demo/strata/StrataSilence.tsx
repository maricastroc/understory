import { gapBody, gapLetter } from "../../../line-investigation/copy/gap-copy";
import type { ViewArtifact } from "../../../line-investigation/model/types";
import { silenceTitle } from "./strata-copy";
import { STRATA_COLUMNS } from "./strata-metrics";
import type { StrataLayout, StrataMetrics } from "./types";

export function StrataSilence({
  layout,
  m,
  byId,
}: {
  layout: StrataLayout;
  m: StrataMetrics;
  byId: Map<string, ViewArtifact>;
}) {
  const wide = m.mode === "wide";
  const oldest = layout.strata.at(-1)?.artifact.id;
  return layout.breaks.flatMap((b) => {
    const after = b.gap && byId.get(b.gap.afterId);
    if (b.kind !== "silent" || !b.gap || !after) return [];
    return [
      <div
        key={b.top}
        className={`absolute grid grid-cols-[18px_minmax(0,1fr)] gap-x-2.5 bg-strata-ground font-li-body ${
          wide ? "right-10 -translate-y-1/2 py-3" : "right-4 px-2 py-2"
        }`}
        style={
          wide
            ? { left: STRATA_COLUMNS.clause, top: (b.top + b.bottom) / 2 }
            : { left: m.codeX - 8, top: b.top + 12 }
        }
      >
        <span aria-hidden className="font-li-mono text-sm leading-6.25 text-strata-neutral-700">
          {gapLetter(b.gap)}
        </span>
        <span className="flex flex-col gap-1">
          <span
            className={`leading-[1.3] font-medium text-strata-neutral-800 ${wide ? "text-[19px]" : "text-[15px]"}`}
          >
            {silenceTitle(after.id === oldest)}
          </span>
          <span
            className={`leading-[1.45] text-pretty text-strata-neutral-700 ${wide ? "text-sm" : "text-[13px]"}`}
          >
            {gapBody(b.gap, after)}
          </span>
        </span>
      </div>,
    ];
  });
}
