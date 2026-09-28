"use client";

import type { TreeOverview } from "@git-investigator/core/types";
import { useId, useMemo, useState } from "react";
import { useHorizontalOverflow } from "../../line-investigation/specimen/use-horizontal-overflow";
import { useElementWidth } from "../../pr-investigation/case/use-element-width";
import { MapCanvas, useCoreViews } from "./MapCanvas";
import { MapHeader } from "./MapHeader";
import { legendKeys } from "./legend-keys";
import { MapLegend } from "./MapLegend";
import { MapReading } from "./MapReading";
import { layoutMap } from "./map-layout";
import { mapSummary } from "./map-summary";
import { mappedLine, scopeAbout, scopeWhy } from "./scope-copy";
import { prAbsence, shareLine } from "./share-copy";
import type { HistoryMapControl } from "./use-history-map";

export function HistoryMap({
  overview,
  caseCounts,
  matches,
  map,
  onOpen,
}: {
  overview: TreeOverview;
  caseCounts: ReadonlyMap<string, number>;
  matches: ReadonlySet<string> | null;
  map: HistoryMapControl;
  onOpen: (path: string) => void;
}) {
  const titleId = useId();
  const [boxRef, width] = useElementWidth();
  const [scrollRef, scrolls] = useHorizontalOverflow();
  const [focus, setFocus] = useState<string | null>(null);
  const layout = useMemo(
    () => layoutMap(overview.files, width || 1120, caseCounts),
    [overview.files, width, caseCounts],
  );
  const { views, scale } = useCoreViews(layout, map.states, overview.head);
  const total = overview.files.length;
  const histories = useMemo(
    () =>
      overview.files.flatMap((f) => {
        const s = map.states.get(f.path);
        return s?.status === "mapped" && s.history ? [s.history] : [];
      }),
    [overview.files, map.states],
  );
  const share = shareLine(histories, overview.prData);
  const sparse = layout.mode === "sparse";
  const broken = histories.length > 0 && scale?.breakAt != null;
  const about = [
    scopeAbout(overview),
    `Depth is how long before HEAD each current line was last changed${
      broken ? "; below the zigzag break it is compressed to fit one much older file" : ""
    }. Percentages count lines in mapped files only.`,
    prAbsence(histories, overview.prData),
  ].filter((line): line is string => !!line);
  const legend = <MapLegend present={legendKeys(layout, map.states, broken)} note={share} />;
  const focused = focus ? (layout.cores.find((c) => c.path === focus) ?? null) : null;

  const canvas = (
    <div
      ref={scrollRef}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? "region" : undefined}
      aria-label={scrolls ? "History map, scroll sideways for more files" : undefined}
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
    >
      <MapCanvas
        layout={layout}
        head={overview.head}
        recentCommits={overview.recentCommits}
        matches={matches}
        states={map.states}
        focus={focus}
        onFocus={setFocus}
        onOpen={onOpen}
        card={!sparse}
      />
    </div>
  );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <MapHeader
        titleId={titleId}
        scope={scopeWhy(overview, !sparse)}
        about={about}
        mapped={map.mapped < total ? mappedLine(map.mapped, total, map.mapping) : null}
        moreLabel={map.mapMore ? `Map ${map.remaining} more` : null}
        onMapMore={map.mapMore}
      />
      {!sparse && legend}
      <div
        ref={boxRef}
        className="w-full"
        onMouseLeave={() => setFocus(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setFocus(null);
        }}
      >
        {sparse ? (
          <div className="flex items-start gap-10">
            {canvas}
            <aside
              aria-label="File inspector"
              className="min-w-0 flex-1 border-l border-li-divider pl-8"
              style={{ maxWidth: 520 }}
            >
              <MapReading
                summary={mapSummary(layout, views)}
                focused={focused}
                view={focused ? (views.get(focused.path) ?? null) : null}
                status={focused ? (map.states.get(focused.path)?.status ?? "stub") : "stub"}
                recentCommits={overview.recentCommits}
                prUnavailable={overview.prData === "none"}
                onOpen={onOpen}
              />
            </aside>
          </div>
        ) : (
          canvas
        )}
      </div>
      {sparse && legend}
    </section>
  );
}
