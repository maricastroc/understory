import type { KeyboardEvent, ReactNode } from "react";
import type { ViewClause } from "../model/types";
import { ClauseLetters } from "./ClauseLetters";
import { ClauseRing } from "./ClauseRing";
import { ClauseTally } from "./ClauseTally";
import { ClauseText } from "./ClauseText";

const FOCUS =
  "cursor-pointer rounded-[3px] text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none";

export function ClauseRow({
  clause,
  description,
  expanded,
  pinned,
  marked,
  quiet,
  compact,
  dense = false,
  tabIndex,
  onEnter,
  onLeave,
  onPick,
  onKeyDown,
  buttonRef,
  refs,
  tally,
}: {
  clause: ViewClause;
  description: string;
  expanded: boolean;
  pinned: boolean;
  marked: boolean;
  quiet: boolean;
  compact: boolean;
  dense?: boolean;
  tabIndex: number;
  onEnter: () => void;
  onLeave: () => void;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  refs?: ReactNode;
  tally?: { cells: ReactNode; label: string };
}) {
  const refsNode = refs ?? <ClauseLetters clause={clause} />;
  const descId = `clause-desc-${clause.id}`;
  const surface = pinned ? "bg-li-evidence-pinned" : expanded || marked ? "bg-li-neutral-200" : "";
  const ink = quiet ? "text-li-text-muted" : clause.silent ? "text-li-gap-ink" : "text-li-ink";
  const tallyVisible = `pointer-events-none transition-opacity duration-150 motion-reduce:transition-none ${
    expanded ? "opacity-100" : "opacity-0"
  }`;

  return (
    <li data-clause={clause.id}>
      <button
        type="button"
        ref={buttonRef}
        aria-pressed={pinned}
        aria-describedby={descId}
        tabIndex={tabIndex}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onClick={onPick}
        onKeyDown={onKeyDown}
        className={
          dense
            ? `grid h-8.5 w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-1.5 pr-2 pl-1 ${FOCUS} ${surface}`
            : `grid min-h-12.5 w-full items-start ${compact ? "grid-cols-[22px_minmax(0,1fr)]" : "grid-cols-[22px_minmax(0,1fr)_150px]"} gap-1.5 py-1 pr-2 pl-1 ${FOCUS} ${surface}`
        }
      >
        <ClauseRing
          silent={clause.silent}
          filled={expanded}
          className={dense ? "ml-1" : "mt-1 ml-1"}
        />
        {dense ? (
          <span className="pointer-events-none flex min-w-0 items-baseline gap-1.5">
            <span className={`truncate text-[17px] leading-[1.42] font-medium ${ink}`}>
              {clause.text}
            </span>
            {refsNode}
          </span>
        ) : (
          <ClauseText
            clause={clause}
            refs={refsNode}
            expanded={expanded}
            compact={compact}
            ink={ink}
            surface={surface}
            tally={tally}
          />
        )}
        {dense ? (
          <span className={tallyVisible}>
            <ClauseTally clause={clause} layout="inline" custom={tally} />
          </span>
        ) : (
          !compact && (
            <span className={tallyVisible}>
              <ClauseTally clause={clause} layout="column" custom={tally} />
            </span>
          )
        )}
      </button>
      <span id={descId} className="sr-only">
        {description}
      </span>
    </li>
  );
}
