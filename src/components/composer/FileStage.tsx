"use client";

import type { RepoMeta, TreeOverview } from "@git-investigator/core/types";
import { useMemo } from "react";
import { HistoryMap } from "./history/HistoryMap";
import { MapSearch } from "./MapSearch";
import { RepoMetaRow } from "./RepoMetaRow";

export function FileStage({
  meta,
  overview,
  overviewError,
  caseCounts,
  query,
  onQuery,
  results,
  searching,
  onOpen,
}: {
  meta: RepoMeta | null;
  overview: TreeOverview | null;
  overviewError: string | null;
  caseCounts: ReadonlyMap<string, number>;
  query: string;
  onQuery: (v: string) => void;
  results: string[];
  searching: boolean;
  onOpen: (path: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => overview?.files ?? [], [overview]);
  const matches = useMemo(
    () =>
      q ? new Set(shown.filter((f) => f.path.toLowerCase().includes(q)).map((f) => f.path)) : null,
    [q, shown],
  );
  const note = matches ? `${matches.size} of ${shown.length} shown` : "↵ open";

  const submit = () => {
    const first = shown.find((f) => matches?.has(f.path))?.path ?? results[0];
    if (first) onOpen(first);
  };

  return (
    <section aria-label="Choose a file" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <MapSearch
          query={query}
          onQuery={onQuery}
          results={results}
          searching={searching}
          note={note}
          onOpen={onOpen}
          onSubmit={submit}
        />
        {meta && <RepoMetaRow meta={meta} overview={overview} />}
      </div>
      {overview ? (
        <HistoryMap overview={overview} caseCounts={caseCounts} matches={matches} onOpen={onOpen} />
      ) : overviewError ? (
        <p role="alert" className="border-t border-li-ink pt-3 text-[12.5px] text-li-neutral-800">
          The file list could not be read: {overviewError}. Search still works.
        </p>
      ) : (
        <p role="status" className="border-t border-li-ink pt-3 text-[12.5px] text-li-neutral-700">
          Reading the file tree…
        </p>
      )}
    </section>
  );
}
