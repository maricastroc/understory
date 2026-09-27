"use client";

import { useId } from "react";
import { Search } from "../icons";
import { Highlight } from "./Highlight";
import { SPINNER } from "./composer-classes";

export function MapSearch({
  query,
  onQuery,
  results,
  searching,
  note,
  onOpen,
  onSubmit,
}: {
  query: string;
  onQuery: (v: string) => void;
  results: string[];
  searching: boolean;
  note: string;
  onOpen: (path: string) => void;
  onSubmit: () => void;
}) {
  const listId = useId();
  const q = query.trim();
  const open = q.length >= 2 && results.length > 0;

  return (
    <div className="relative w-110 max-w-full shrink-0">
      <div className="flex h-10.5 items-center gap-2.5 border border-li-neutral-500 bg-li-neutral-100 px-3.5 transition-colors focus-within:border-li-steel motion-reduce:transition-none">
        <Search className="size-4 shrink-0 text-li-neutral-700" />
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
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-li-ink outline-none placeholder:text-li-text-muted"
        />
        {searching ? (
          <span aria-hidden className={`size-3.5 ${SPINNER}`} />
        ) : (
          <span className="shrink-0 font-li-mono text-[11px] text-li-neutral-700">{note}</span>
        )}
      </div>
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
                className="block w-full cursor-pointer truncate px-3.5 py-1.5 text-left font-li-mono text-[12.5px] text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel"
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
