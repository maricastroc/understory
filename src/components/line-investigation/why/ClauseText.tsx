import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { ViewClause } from "../model/types";
import { ClauseTally } from "./ClauseTally";

export function ClauseText({
  clause,
  refs,
  expanded,
  compact,
  ink,
  surface,
  tally,
}: {
  clause: ViewClause;
  refs: ReactNode;
  expanded: boolean;
  compact: boolean;
  ink: string;
  surface: string;
  tally?: { cells: ReactNode; label: string };
}) {
  const sizer = useRef<HTMLSpanElement>(null);
  const full = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (!expanded || !full.current || !sizer.current) return;
    const over = full.current.scrollHeight > sizer.current.clientHeight + 1;
    setOverflowing((prev) => (prev === over ? prev : over));
  }, [expanded, clause.text]);

  return (
    <span className="pointer-events-none relative min-w-0">
      <span ref={sizer} aria-hidden className="invisible block">
        <span className="line-clamp-3 text-base leading-[1.42]">
          {clause.text} {refs}
        </span>
        {compact && <ClauseTally clause={clause} layout="below" custom={tally} />}
      </span>
      {expanded ? (
        <span
          ref={full}
          className={`absolute inset-x-0 top-0 z-10 block text-base leading-[1.42] ${ink} ${
            overflowing ? `${surface || "bg-li-paper"} pb-1 shadow-li-md` : ""
          }`}
        >
          {clause.text} {refs}
          {compact && <ClauseTally clause={clause} layout="below" custom={tally} />}
        </span>
      ) : (
        <span className="absolute inset-x-0 top-0 flex min-w-0 items-baseline gap-1.5">
          <span className={`truncate text-[17px] leading-[1.42] font-medium ${ink}`}>
            {clause.text}
          </span>
          {refs}
        </span>
      )}
    </span>
  );
}
