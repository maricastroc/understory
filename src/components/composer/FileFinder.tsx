import { Close, FileIcon, Search } from "../icons";
import { Highlight } from "./Highlight";

export function FileFinder({
  query,
  setQuery,
  results,
  searching,
  enabled,
  showEmpty,
  onOpenFile,
}: {
  query: string;
  setQuery: (v: string) => void;
  results: string[];
  searching: boolean;
  enabled: boolean;
  showEmpty: boolean;
  onOpenFile: (path: string) => void;
}) {
  const q = query.trim();
  const isDefault = q.length < 2;

  return (
    <>
      <div className="flex items-center gap-3 px-3.5 py-2.5 transition-colors focus-within:bg-inset/40">
        <span className="w-16 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          Find
        </span>
        <Search className="size-4 shrink-0 text-ink-3" />
        <input
          aria-label="Search files or symbols"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!enabled}
          placeholder={
            enabled ? "Search files or symbols…  e.g. chargeCustomer" : "Open a repository first"
          }
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
        />
        {searching && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
        )}
        {!searching && q !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors hover:bg-inset hover:text-ink-2"
          >
            <Close className="size-3.5" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="border-t border-line">
          {isDefault && (
            <div className="px-3.5 pt-2.5 pb-1 text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              Suggested files
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto pb-1">
            {results.map((f) => (
              <li key={f}>
                <button
                  onClick={() => onOpenFile(f)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-inset"
                >
                  <FileIcon className="size-3.5 shrink-0 text-ink-3" />
                  <span className="truncate font-mono text-[12.5px] text-ink">
                    <Highlight text={f} q={isDefault ? "" : q} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showEmpty && (
        <div className="border-t border-line px-3.5 py-3 text-[12.5px] text-ink-3">
          No files match &ldquo;{q}&rdquo;.
        </div>
      )}
    </>
  );
}
