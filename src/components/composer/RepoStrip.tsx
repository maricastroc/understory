"use client";

import type { RepoMeta, TreeOverview } from "@understory/core/types";
import { useId, useState } from "react";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { repoDisplayName } from "../shell/repo-display-name";
import type { HistoryMapControl } from "./history/use-history-map";
import { RepoDetails } from "./RepoDetails";

export function RepoStrip({
  repoPath,
  meta,
  overview,
  map,
}: {
  repoPath: string;
  meta: RepoMeta | null;
  overview: TreeOverview | null;
  map: HistoryMapControl;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const name = repoDisplayName(meta?.name ?? repoPath);
  const head = overview?.head ?? null;

  return (
    <section aria-label="Repository" className="border-y border-li-divider">
      <div className="flex min-h-10 min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 py-2 text-[14px]">
        <DomainIcon kind="repository" />
        <span className="font-medium text-li-ink">{name}</span>
        {meta?.branch && (
          <span className="font-li-mono text-[12.5px] text-li-neutral-800">/ {meta.branch}</span>
        )}
        {head && (
          <>
            <span aria-hidden className="text-li-text-muted">
              ·
            </span>
            <span className="font-li-mono text-[12.5px] text-li-neutral-800">
              HEAD {head.sha.slice(0, 7)}
            </span>
          </>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 ml-auto flex h-7 cursor-pointer items-center gap-1.5 px-2 text-[12.5px] text-li-neutral-800 transition-colors hover:bg-li-neutral-200 hover:text-li-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-li-focus aria-expanded:text-li-ink"
        >
          {open ? "Hide details" : "Details"}
          <span aria-hidden className="text-[10px]">
            {open ? "▴" : "▾"}
          </span>
        </button>
      </div>
      <div id={detailsId} hidden={!open}>
        {open && <RepoDetails meta={meta} overview={overview} map={map} />}
      </div>
    </section>
  );
}
