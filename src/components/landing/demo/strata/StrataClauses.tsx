import { type Dispatch, type KeyboardEvent, useRef, useState } from "react";
import { clauseDescription } from "../../../line-investigation/copy/clause-copy";
import type {
  InvestigationView,
  TallyState,
  ViewArtifact,
  ViewClause,
} from "../../../line-investigation/model/types";
import type { CaseAction } from "../../../line-investigation/state/types";
import { strataTally } from "./strata-copy";
import { STRATA_COLUMNS } from "./strata-metrics";
import type { ClauseSlot } from "./types";

const CELL: Record<TallyState, string> = {
  verified: "bg-strata-trace",
  cited: "border border-strata-trace",
  weak: "border border-strata-trace",
  misattributed: "border border-dashed border-strata-neutral-600",
  unaudited: "border border-dashed border-strata-neutral-600",
  unknown: "border border-strata-ink",
};

const FOCUS =
  "cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-strata-bore-ink";

function Clause({
  clause,
  description,
  descId,
  on,
  wide,
  tabIndex,
  onEnter,
  onPick,
  onKeyDown,
  buttonRef,
}: {
  clause: ViewClause;
  description: string;
  descId: string;
  on: boolean;
  wide: boolean;
  tabIndex: number;
  onEnter: () => void;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        aria-pressed={on}
        aria-describedby={descId}
        tabIndex={tabIndex}
        onMouseEnter={onEnter}
        onFocus={onEnter}
        onClick={onPick}
        onKeyDown={onKeyDown}
        className={`grid w-full grid-cols-[18px_minmax(0,1fr)] gap-x-2.5 ${FOCUS}`}
      >
        <span
          aria-hidden
          className={`mt-[6.5px] size-3 rounded-full border-[1.5px] ${
            on ? "border-strata-trace-ink bg-strata-trace" : "border-strata-neutral-700"
          }`}
        />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span
            className={`flex flex-wrap items-center gap-x-2 leading-[1.3] ${wide ? "text-[19px]" : "text-base"} ${
              on ? "font-semibold text-strata-ink" : "font-medium text-strata-neutral-800"
            }`}
          >
            {clause.text}
            <span
              aria-hidden
              className="inline-flex gap-0.5 font-li-mono text-[10.5px] leading-3.5 font-normal"
            >
              {clause.letters.map((l) => (
                <span key={l} className="bg-strata-ink px-1 text-strata-ground">
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span
            aria-hidden
            className={`flex items-center gap-2 font-li-mono text-[11px] text-strata-trace-ink ${on ? "" : "invisible"}`}
          >
            <span className="flex gap-0.5">
              {clause.cells.map((c) => (
                <span key={c.citation} className={`box-border h-1.5 w-3.5 ${CELL[c.state]}`} />
              ))}
            </span>
            {strataTally(clause)}
          </span>
        </span>
      </button>
      <span id={descId} className="sr-only">
        {description}
      </span>
    </>
  );
}

export function StrataClauses({
  view,
  byId,
  slots,
  active,
  dispatch,
  labelledBy,
  idPrefix,
}: {
  view: InvestigationView;
  byId: Map<string, ViewArtifact>;
  slots: ClauseSlot[] | null;
  active: string | null;
  dispatch: Dispatch<CaseAction>;
  labelledBy: string;
  idPrefix: string;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [focusIndex, setFocusIndex] = useState(0);
  const wide = slots !== null;
  const place = new Map(slots?.map((s) => [s.id, s.y]));
  const clauses = wide ? view.clauses.filter((c) => place.has(c.id)) : view.clauses;

  const move = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = Math.min(
      clauses.length - 1,
      Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)),
    );
    setFocusIndex(next);
    buttons.current.get(clauses[next].id)?.focus();
  };

  return (
    <ol
      aria-labelledby={labelledBy}
      className={wide ? "absolute inset-0" : "flex flex-col gap-2"}
      style={wide ? { pointerEvents: "none" } : undefined}
    >
      {clauses.map((clause, i) => (
        <li
          key={clause.id}
          data-clause={clause.id}
          className={wide ? "pointer-events-auto absolute right-10" : undefined}
          style={
            wide
              ? { top: (place.get(clause.id) ?? 0) - 12.5, left: STRATA_COLUMNS.clause }
              : undefined
          }
        >
          <Clause
            clause={clause}
            description={clauseDescription(clause, byId)}
            descId={`${idPrefix}-clause-${clause.id}`}
            on={active === clause.id}
            wide={wide}
            tabIndex={i === focusIndex ? 0 : -1}
            onEnter={() => dispatch({ type: "hover-clause", id: clause.id })}
            onPick={() => {
              setFocusIndex(i);
              dispatch({ type: "toggle-pin", id: clause.id });
            }}
            onKeyDown={(e) => move(e, i)}
            buttonRef={(el) => {
              if (el) buttons.current.set(clause.id, el);
              else buttons.current.delete(clause.id);
            }}
          />
        </li>
      ))}
    </ol>
  );
}
