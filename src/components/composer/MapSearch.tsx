"use client";

import { useId } from "react";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { Highlight } from "./Highlight";
import { FIELD_FRAME, SPINNER } from "./composer-classes";

export function MapSearch({
  query,
  onQuery,
  results,
  searching,
  note,
  onOpen,
  onSubmit,
  empty = false,
}: {
  query: string;
  onQuery: (v: string) => void;
  results: string[];
  searching: boolean;
  note: string;
  onOpen: (path: string) => void;
  onSubmit: () => void;
  empty?: boolean;
}) {
  const listId = useId();
  const q = query.trim();
  const open = q.length >= 2 && results.length > 0;

  return (
    <div className="relative w-full max-w-160">
      <div className={`flex h-12 items-center gap-3 px-4 ${FIELD_FRAME}`}>
        <DomainIcon kind="file" />
        <input
          aria-label="Find a file or symbol"
          aria-controls={open ? listId : undefined}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
            if (e.key === "Escape") onQuery("");
          }}
          placeholder="Find a file or symbol, e.g. chargeCustomer"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-li-ink outline-none placeholder:text-li-text-muted"
        />
        {searching ? (
          <span aria-hidden className={`size-3.5 ${SPINNER}`} />
        ) : (
          <span className="shrink-0 font-li-mono text-[11px] text-li-text-subtle tnum">{note}</span>
        )}
      </div>
      {empty && !open && (
        <p
          role="status"
          className="absolute inset-x-0 top-full z-20 border border-t-0 border-li-divider bg-li-paper px-3.5 py-2.5 text-[12.5px] text-li-neutral-800 shadow-li-md"
        >
          Nothing matches <span className="font-li-mono">&ldquo;{q}&rdquo;</span>. Try part of a
          file name, or a word from the code.
        </p>
      )}
      {open && (
        <ul
          id={listId}
          aria-label="Matching files"
          className="absolute inset-x-0 top-full z-20 max-h-72 overflow-y-auto border border-t-0 border-li-divider bg-li-paper py-1 shadow-li-md"
        >
          {results.map((path) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => onOpen(path)}
                className="block w-full cursor-pointer truncate px-3.5 py-1.5 text-left font-li-mono text-[12.5px] text-li-ink hover:bg-li-neutral-200 focus-visible:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus active:bg-li-neutral-300"
              >
                <Highlight text={path} q={q} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
