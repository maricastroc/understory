import type { KeyboardEvent, ReactNode } from "react";
import { tallyText } from "../copy/clause-copy";
import type { ViewClause } from "../model/types";
import { ClauseLetters } from "./ClauseLetters";
import { ClauseRing } from "./ClauseRing";
import { ClauseText } from "./ClauseText";
import { TallyCells } from "./TallyCells";

const FOCUS =
  "cursor-pointer rounded-[3px] text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus motion-reduce:transition-none";

const SURFACE = {
  pinned: "bg-li-neutral-200 shadow-[inset_3px_0_0_var(--color-li-evidence)]",
  silent: "bg-li-neutral-200 shadow-[inset_3px_0_0_var(--color-li-gap)]",
  inspected: "bg-li-neutral-200",
  rest: "",
} as const;

function Meta({ clause, open, inline }: { clause: ViewClause; open: boolean; inline: boolean }) {
  const words = (
    <span
      className={`text-[11.5px] whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none ${
        clause.silent ? "text-li-gap-ink" : "text-li-neutral-800"
      } ${open ? "opacity-100" : "opacity-0"}`}
    >
      {tallyText(clause)}
    </span>
  );
  const marks = (
    <span className="flex items-center gap-1.5">
      <TallyCells clause={clause} />
      <ClauseLetters clause={clause} />
    </span>
  );
  return (
    <span
      aria-hidden
      className={`pointer-events-none flex ${
        inline ? "flex-wrap items-center gap-x-2.5 gap-y-0.5" : "flex-col items-end gap-1 pt-[3px]"
      }`}
    >
      {marks}
      {words}
    </span>
  );
}

export function ClauseRow({
  clause,
  description,
  expanded,
  pinned,
  marked,
  quiet,
  compact,
  tabIndex,
  onPointerIn,
  onPointerOut,
  onFocusIn,
  onFocusOut,
  onPick,
  onKeyDown,
  buttonRef,
  evidence,
  controls,
}: {
  clause: ViewClause;
  description: string;
  expanded: boolean;
  pinned: boolean;
  marked: boolean;
  quiet: boolean;
  compact: boolean;
  tabIndex: number;
  onPointerIn: () => void;
  onPointerOut: () => void;
  onFocusIn: () => void;
  onFocusOut: () => void;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  evidence?: ReactNode;
  controls?: string;
}) {
  const descId = `clause-desc-${clause.id}`;
  const open = expanded || pinned;
  const surface = pinned
    ? clause.silent
      ? SURFACE.silent
      : SURFACE.pinned
    : expanded || marked
      ? SURFACE.inspected
      : SURFACE.rest;
  const ink = clause.silent ? "text-li-gap-ink" : quiet ? "text-li-neutral-800" : "text-li-ink";

  return (
    <li data-clause={clause.id}>
      <button
        type="button"
        ref={buttonRef}
        aria-expanded={pinned}
        aria-controls={pinned ? controls : undefined}
        aria-describedby={descId}
        tabIndex={tabIndex}
        onMouseEnter={onPointerIn}
        onMouseLeave={onPointerOut}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
        onClick={onPick}
        onKeyDown={onKeyDown}
        className={`grid w-full items-start gap-x-2 py-1.5 pr-2 pl-1 ${
          compact ? "grid-cols-[22px_minmax(0,1fr)]" : "grid-cols-[22px_minmax(0,1fr)_136px]"
        } ${FOCUS} ${surface}`}
      >
        <ClauseRing silent={clause.silent} filled={open} className="mt-1.5 ml-1" />
        <span className="flex min-w-0 flex-col gap-1">
          <ClauseText text={clause.text} open={open} ink={ink} />
          {compact && <Meta clause={clause} open={open} inline />}
        </span>
        {!compact && <Meta clause={clause} open={open} inline={false} />}
      </button>
      <span id={descId} className="sr-only">
        {description}
      </span>
      {evidence}
    </li>
  );
}
