import { type KeyboardEvent, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { tallyText } from "../copy/clause-copy";
import type { ViewClause } from "../model/types";
import { ClauseLetters } from "./ClauseLetters";
import { TallyCells } from "./TallyCells";

export function ClauseRow({
  clause,
  description,
  expanded,
  pinned,
  marked,
  quiet,
  compact,
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
  const sizer = useRef<HTMLSpanElement>(null);
  const full = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (!expanded || !full.current || !sizer.current) return;
    const over = full.current.scrollHeight > sizer.current.clientHeight + 1;
    setOverflowing((prev) => (prev === over ? prev : over));
  }, [expanded, clause.text]);

  const surface = pinned ? "bg-li-evidence-pinned" : expanded || marked ? "bg-li-neutral-200" : "";
  const ring = clause.silent
    ? `border-dashed border-li-gap ${expanded ? "bg-li-gap" : ""}`
    : `border-li-evidence-ink ${expanded ? "bg-li-evidence" : ""}`;
  const ink = quiet ? "text-li-text-muted" : clause.silent ? "text-li-gap-ink" : "text-li-ink";

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
        className={`grid min-h-12.5 w-full cursor-pointer items-start ${compact ? "grid-cols-[22px_minmax(0,1fr)]" : "grid-cols-[22px_minmax(0,1fr)_150px]"} gap-1.5 rounded-[3px] py-1 pr-2 pl-1 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none ${surface}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none mt-1 ml-1 size-3 rounded-full border-[1.5px] ${ring}`}
        />
        <span className="pointer-events-none relative min-w-0">
          <span ref={sizer} aria-hidden className="invisible block">
            <span className="line-clamp-3 text-base leading-[1.42]">
              {clause.text} {refsNode}
            </span>
            {compact && <Tally clause={clause} compact custom={tally} />}
          </span>
          {expanded ? (
            <span
              ref={full}
              className={`absolute inset-x-0 top-0 z-10 block text-base leading-[1.42] ${ink} ${
                overflowing ? `${surface || "bg-li-paper"} pb-1 shadow-li-md` : ""
              }`}
            >
              {clause.text} {refsNode}
              {compact && <Tally clause={clause} compact custom={tally} />}
            </span>
          ) : (
            <span className="absolute inset-x-0 top-0 flex min-w-0 items-baseline gap-1.5">
              <span className={`truncate text-[17px] leading-[1.42] font-medium ${ink}`}>
                {clause.text}
              </span>
              {refsNode}
            </span>
          )}
        </span>
        {!compact && (
          <span
            className={`pointer-events-none transition-opacity duration-150 motion-reduce:transition-none ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <Tally clause={clause} compact={false} custom={tally} />
          </span>
        )}
      </button>
      <span id={descId} className="sr-only">
        {description}
      </span>
    </li>
  );
}

function Tally({
  clause,
  compact,
  custom,
}: {
  clause: ViewClause;
  compact: boolean;
  custom?: { cells: ReactNode; label: string };
}) {
  return (
    <span
      aria-hidden
      className={`flex gap-0.75 ${compact ? "mt-1 flex-row items-center gap-2" : "flex-col items-end pt-0.75"}`}
    >
      {custom ? custom.cells : <TallyCells clause={clause} />}
      <span
        className={`text-[11.5px] whitespace-nowrap ${clause.silent ? "text-li-gap-ink" : "text-li-neutral-800"}`}
      >
        {custom ? custom.label : tallyText(clause)}
      </span>
    </span>
  );
}
