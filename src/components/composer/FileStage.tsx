"use client";

import type { TreeOverview } from "@understory/core/types";
import { useMemo } from "react";
import { useMessages } from "@/i18n/LocaleProvider";
import type { ApiFailure } from "@/lib/api-error";
import { ErrorState } from "../ErrorState";
import { HistoryMap } from "./history/HistoryMap";
import type { HistoryMapControl } from "./history/use-history-map";
import { SECTION_RULE } from "./composer-classes";
import { MapSearch } from "./MapSearch";

export function FileStage({
  overview,
  overviewError,
  caseCounts,
  query,
  onQuery,
  results,
  searching,
  settled = true,
  map,
  onOpen,
}: {
  overview: TreeOverview | null;
  overviewError: ApiFailure | null;
  caseCounts: ReadonlyMap<string, number>;
  query: string;
  onQuery: (v: string) => void;
  results: string[];
  searching: boolean;
  settled?: boolean;
  map: HistoryMapControl;
  onOpen: (path: string) => void;
}) {
  const f = useMessages().composer.files;
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => overview?.files ?? [], [overview]);
  const matches = useMemo(
    () =>
      q ? new Set(shown.filter((f) => f.path.toLowerCase().includes(q)).map((f) => f.path)) : null,
    [q, shown],
  );
  const note = matches ? f.shown(matches.size, shown.length) : f.open;

  const submit = () => {
    const first = shown.find((f) => matches?.has(f.path))?.path ?? results[0];
    if (first) onOpen(first);
  };

  return (
    <section aria-label={f.choose} className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <MapSearch
          query={query}
          onQuery={onQuery}
          results={results}
          searching={searching}
          note={note}
          onOpen={onOpen}
          onSubmit={submit}
          empty={
            settled && !searching && q.length >= 2 && results.length === 0 && matches?.size === 0
          }
        />
      </div>
      {overview ? (
        <HistoryMap
          overview={overview}
          caseCounts={caseCounts}
          matches={matches}
          map={map}
          onOpen={onOpen}
        />
      ) : overviewError ? (
        <div className={SECTION_RULE}>
          <ErrorState failure={overviewError} title={f.treeFailed} />
        </div>
      ) : (
        <p role="status" className={`text-[13px] text-li-text-subtle ${SECTION_RULE}`}>
          {f.readingTree}
        </p>
      )}
    </section>
  );
}
