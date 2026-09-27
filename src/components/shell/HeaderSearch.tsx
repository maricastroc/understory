"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFileSearch } from "../composer/use-file-search";
import { Search } from "../icons";
import type { SearchOption } from "./search-option";
import type { RailItem } from "./types";
import { useDismiss } from "./use-dismiss";

const MAX_CASES = 6;
const MAX_FILES = 8;

export function HeaderSearch({
  cases,
  onSelectCase,
  files,
  onOpenFile,
}: {
  cases: RailItem[];
  onSelectCase: (item: RailItem) => void;
  files: { repoPath: string; enabled: boolean; token?: string } | null;
  onOpenFile?: (path: string) => void;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searchText, setSearchText] = useState("");
  const needle = searchText.trim().toLowerCase();
  const fileSearch = useFileSearch(
    files?.repoPath ?? "",
    !!files?.enabled && needle.length >= 2,
    undefined,
    files?.token,
  );
  const query = searchText;
  const setQuery = (value: string) => {
    setSearchText(value);
    fileSearch.setQuery(value);
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [box], []);
  useDismiss(open, refs, close);

  const options: SearchOption[] = useMemo(() => {
    if (!needle) return [];
    const caseHits = cases
      .filter((c) => `${c.title} ${c.subline} ${c.id}`.toLowerCase().includes(needle))
      .slice(0, MAX_CASES)
      .map((item) => ({ type: "case" as const, item }));
    const fileHits =
      files?.enabled && needle.length >= 2
        ? fileSearch.results.slice(0, MAX_FILES).map((path) => ({ type: "file" as const, path }))
        : [];
    return [...caseHits, ...fileHits];
  }, [needle, cases, files?.enabled, fileSearch.results]);

  const choose = (option: SearchOption) => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
    if (option.type === "case") onSelectCase(option.item);
    else onOpenFile?.(option.path);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      input.current?.blur();
      return;
    }
    if (!options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + delta + options.length) % options.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      choose(options[Math.min(active, options.length - 1)]);
    }
  };

  const caseOptions = options.filter((o) => o.type === "case");
  const fileOptions = options.filter((o) => o.type === "file");
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const showList = open && needle.length > 0;
  const placeholder = files?.enabled ? "Search files, symbols or cases" : "Search cases";

  const renderOption = (o: SearchOption, i: number) => (
    <li
      key={o.type === "case" ? `c-${o.item.kind}-${o.item.id}` : `f-${o.path}`}
      id={optionId(i)}
      role="option"
      aria-selected={i === active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => choose(o)}
      onMouseEnter={() => setActive(i)}
      className={`flex cursor-pointer flex-col px-3 py-1.5 ${i === active ? "bg-li-neutral-200" : ""}`}
    >
      {o.type === "case" ? (
        <>
          <span className="truncate text-[13px] text-li-ink">{o.item.title}</span>
          <span className="truncate font-li-mono text-[10.5px] text-li-text-subtle">
            {o.item.subline}
          </span>
        </>
      ) : (
        <span className="truncate font-li-mono text-xs text-li-ink">{o.path}</span>
      )}
    </li>
  );

  return (
    <div ref={box} className="relative ml-3 max-w-115 min-w-0 flex-1 max-[1280px]:hidden">
      <label className="flex items-center gap-2 rounded border border-li-divider px-2.5 py-1.5 text-[13px] text-li-text-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-li-steel">
        <Search className="size-3.5 shrink-0" />
        <span className="sr-only">{placeholder}</span>
        <input
          ref={input}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options.length ? optionId(active) : undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-li-ink outline-none placeholder:text-li-text-subtle"
        />
        <kbd className="shrink-0 rounded-[3px] border border-li-divider px-1.25 font-li-mono text-[11px] text-li-text-subtle">
          ⌘K
        </kbd>
      </label>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute top-10 right-0 left-0 z-40 max-h-96 overflow-auto border border-li-divider bg-li-paper py-1.5 shadow-li-lg"
        >
          {options.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-xs text-li-text-subtle">
              {fileSearch.searching ? "Searching…" : "No matches"}
            </li>
          )}
          {caseOptions.length > 0 && (
            <li role="presentation">
              <ul role="group" aria-label="Cases">
                <li
                  role="presentation"
                  className="px-3 pt-1 pb-0.5 text-[11px] font-semibold text-li-text-subtle"
                >
                  Cases
                </li>
                {caseOptions.map((o) => renderOption(o, options.indexOf(o)))}
              </ul>
            </li>
          )}
          {fileOptions.length > 0 && (
            <li role="presentation">
              <ul role="group" aria-label="Files">
                <li
                  role="presentation"
                  className="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold text-li-text-subtle"
                >
                  Files
                </li>
                {fileOptions.map((o) => renderOption(o, options.indexOf(o)))}
              </ul>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
