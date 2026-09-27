import { Close, FileIcon, Search } from "../icons";
import { FIELD_LABEL, ICON_BUTTON, SPINNER } from "./composer-classes";
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
      <div className="flex items-center gap-3 px-3.5 py-2.5 transition-colors focus-within:bg-li-neutral-200/60 motion-reduce:transition-none">
        <span className={FIELD_LABEL}>Find</span>
        <Search className="size-4 shrink-0 text-li-text-muted" />
        <input
          aria-label="Search files or symbols"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!enabled}
          placeholder={
            enabled ? "Search files or symbols…  e.g. chargeCustomer" : "Open a repository first"
          }
          className="min-w-0 flex-1 bg-transparent text-[13px] text-li-ink outline-none placeholder:text-li-text-muted disabled:cursor-not-allowed"
        />
        {searching && <span aria-hidden className={`size-4 ${SPINNER}`} />}
        {!searching && q !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className={ICON_BUTTON}
          >
            <Close className="size-3.5" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="border-t border-li-divider bg-li-paper">
          {isDefault && (
            <div className="px-3.5 pt-2.5 pb-1 font-li-mono text-[10.5px] tracking-[0.06em] text-li-text-subtle uppercase">
              Suggested files
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto pb-1">
            {results.map((f) => (
              <li key={f}>
                <button
                  onClick={() => onOpenFile(f)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none"
                >
                  <FileIcon className="size-3.5 shrink-0 text-li-text-muted" />
                  <span className="truncate font-li-mono text-[12.5px] text-li-ink">
                    <Highlight text={f} q={isDefault ? "" : q} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showEmpty && (
        <div className="border-t border-li-divider bg-li-paper px-3.5 py-3 text-[12.5px] text-li-text-subtle">
          No files match &ldquo;{q}&rdquo;.
        </div>
      )}
    </>
  );
}
