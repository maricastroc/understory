"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { liButton } from "../line-investigation/parts/button-class";
import type { RepoSummary } from "./types";
import { useDismiss } from "./use-dismiss";

export function RepoSelector({
  repo,
  onNewInRepo,
}: {
  repo: RepoSummary;
  onNewInRepo?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const popId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [button, panel], []);
  useDismiss(open, refs, close);

  return (
    <div className="relative min-w-0">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={popId}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 max-w-full min-w-0 cursor-pointer items-center gap-2 border border-li-divider px-2.5 font-li-mono text-xs text-li-ink transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus aria-expanded:bg-li-neutral-200 motion-reduce:transition-none"
      >
        <span
          aria-hidden
          className={`size-1.5 shrink-0 rounded-full ${
            repo.connected ? "bg-li-evidence" : "border border-li-text-muted"
          }`}
        />
        <span className="truncate">{repo.name}</span>
        {repo.detail && (
          <span className="shrink-0 text-li-text-muted max-[1100px]:hidden">{repo.detail}</span>
        )}
        <span aria-hidden className="text-li-text-muted">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={popId}
          ref={panel}
          role="dialog"
          aria-label="Repository"
          className="absolute top-10 left-0 z-40 flex w-72 flex-col gap-2.5 border border-li-divider bg-li-paper p-3.5 font-li-body shadow-li-lg"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-li-mono text-xs break-all text-li-ink">{repo.name}</span>
            {repo.detail && (
              <span className="font-li-mono text-[11px] text-li-text-subtle">{repo.detail}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {onNewInRepo && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNewInRepo();
                }}
                className={liButton("secondary", "", "sm")}
              >
                New investigation here
              </button>
            )}
            {repo.url && (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={liButton("ghost", "", "sm")}
              >
                Open repository ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
