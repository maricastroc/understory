import { type KeyboardEvent, useId, useRef, useState } from "react";
import { ClauseRow } from "../../line-investigation/why/ClauseRow";
import { clauseRests, clauseTally } from "../copy/clause-copy";
import { listOf } from "../copy/region-copy";
import type { PrClause, PrView } from "../model/types";
import { RegionToken } from "../parts/RegionToken";
import { RegionCells } from "./RegionCells";
import { RegionWhy } from "./RegionWhy";

function hintFor(view: PrView, clause: PrClause | null, selected: string | null): string {
  if (view.mode === "evidence-only") return "";
  if (clause) {
    return clause.regions.length
      ? `clause ${clause.index + 1} rests on ${listOf(clause.regions)}`
      : `clause ${clause.index + 1} cites no changed region`;
  }
  if (selected) return `${selected} selected · ← → moves between regions`;
  return "hover a clause or a region";
}

export function PrWhyZone({
  view,
  effective,
  pinned,
  selected,
  marked,
  compact,
  onHover,
  onPick,
  onClear,
}: {
  view: PrView;
  effective: string | null;
  pinned: string | null;
  selected: string | null;
  marked: Set<string>;
  compact: boolean;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const headingId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [focusIndex, setFocusIndex] = useState(0);
  const clauses = view.clauses;
  const active = clauses.find((c) => c.id === effective) ?? null;
  const region = selected ? view.regions.find((r) => r.id === selected) : undefined;

  const move = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(
      clauses.length - 1,
      Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)),
    );
    setFocusIndex(next);
    buttons.current.get(clauses[next].id)?.focus();
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex h-7 items-center gap-2.5 pl-2">
        <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
          Reconstructed why
        </h2>
        <span className="text-xs text-li-text-subtle">{hintFor(view, active, selected)}</span>
        {(pinned || selected) && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto cursor-pointer rounded-[3px] border border-li-divider px-2 py-0.5 text-[11.5px] text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
          >
            Clear · Esc
          </button>
        )}
      </div>

      {view.mode === "evidence-only" ? (
        <div className="mt-1 flex flex-col gap-1.5 pl-7">
          <p className="text-base text-li-text-subtle">
            No reconstruction. The evidence below is complete.
          </p>
          {view.error && <p className="text-xs text-li-text-subtle">{view.error}</p>}
        </div>
      ) : (
        <ol className="relative mt-1 flex flex-col gap-1.5">
          {clauses.map((clause, i) => {
            const cited = view.regions.filter((r) => clause.regions.includes(r.id));
            return (
              <ClauseRow
                key={clause.id}
                clause={clause}
                description={clauseRests(clause, view.regions)}
                expanded={effective === clause.id}
                pinned={pinned === clause.id}
                marked={!effective && marked.has(clause.id)}
                quiet={effective !== null && effective !== clause.id}
                compact={compact}
                tabIndex={i === focusIndex ? 0 : -1}
                onEnter={() => onHover(clause.id)}
                onLeave={() => onHover(null)}
                onPick={() => {
                  setFocusIndex(i);
                  onPick(clause.id);
                }}
                onKeyDown={(e) => move(e, i)}
                buttonRef={(el) => {
                  if (el) buttons.current.set(clause.id, el);
                  else buttons.current.delete(clause.id);
                }}
                refs={
                  <span
                    aria-hidden
                    className="inline-flex shrink-0 items-center gap-0.5 align-[1px]"
                  >
                    {cited.map((r) => (
                      <RegionToken
                        key={r.id}
                        id={r.id}
                        state={clause.silent ? "silent" : r.state}
                      />
                    ))}
                  </span>
                }
                tally={{
                  cells: <RegionCells regions={cited} />,
                  label: clauseTally(clause, view.regions),
                }}
              />
            );
          })}
        </ol>
      )}

      <div className="mt-0.5 grid min-h-18">
        {view.regions.map((r) => {
          const shown = region?.id === r.id && !active;
          return (
            <div
              key={r.key}
              aria-hidden={shown ? undefined : true}
              className={`col-start-1 row-start-1 ${shown ? "" : "invisible"}`}
            >
              <RegionWhy region={r} view={view} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
