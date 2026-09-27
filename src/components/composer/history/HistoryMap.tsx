"use client";

import type { TreeOverview } from "@git-investigator/core/types";
import { useId, useMemo } from "react";
import { useHorizontalOverflow } from "../../line-investigation/specimen/use-horizontal-overflow";
import { useElementWidth } from "../../pr-investigation/case/use-element-width";
import { MapCanvas } from "./MapCanvas";
import { MapHeader } from "./MapHeader";
import { MapLegend } from "./MapLegend";
import { layoutMap } from "./map-layout";
import { mappedLine, scopeLine } from "./scope-copy";

export function HistoryMap({
  overview,
  caseCounts,
  matches,
  onOpen,
}: {
  overview: TreeOverview;
  caseCounts: ReadonlyMap<string, number>;
  matches: ReadonlySet<string> | null;
  onOpen: (path: string) => void;
}) {
  const titleId = useId();
  const [boxRef, width] = useElementWidth();
  const [scrollRef, scrolls] = useHorizontalOverflow();
  const layout = useMemo(
    () => layoutMap(overview.files, width || 1120, caseCounts),
    [overview.files, width, caseCounts],
  );
  const total = overview.files.length;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3.5">
      <MapHeader
        titleId={titleId}
        scope={scopeLine(overview)}
        mapped={mappedLine(0, total, 0)}
        moreLabel={overview.mappable && total ? `Map ${total} more` : null}
        onMapMore={null}
      />
      <MapLegend note={overview.prData === "none" ? "PR data unavailable for this repo" : null} />
      <div ref={boxRef} className="w-full">
        <div
          ref={scrollRef}
          tabIndex={scrolls ? 0 : undefined}
          role={scrolls ? "region" : undefined}
          aria-label={scrolls ? "History map, scroll sideways for more files" : undefined}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
        >
          <MapCanvas
            layout={layout}
            head={overview.head}
            recentCommits={overview.recentCommits}
            matches={matches}
            onOpen={onOpen}
          />
        </div>
      </div>
    </section>
  );
}
