import type { ViewClause } from "../model/types";
import { ClauseLetters } from "./ClauseLetters";
import { ClauseTally } from "./ClauseTally";

export function ClauseText({
  clause,
  expanded,
  compact,
  ink,
}: {
  clause: ViewClause;
  expanded: boolean;
  compact: boolean;
  ink: string;
}) {
  return (
    <span className="pointer-events-none relative min-w-0">
      <span aria-hidden className="invisible block">
        <span className="block text-base leading-[1.42]">
          {clause.text} <ClauseLetters clause={clause} />
        </span>
        {compact && <ClauseTally clause={clause} layout="below" />}
      </span>
      {expanded ? (
        <span className={`absolute inset-x-0 top-0 block text-base leading-[1.42] ${ink}`}>
          {clause.text} <ClauseLetters clause={clause} />
          {compact && <ClauseTally clause={clause} layout="below" />}
        </span>
      ) : (
        <span className="absolute inset-x-0 top-0 flex min-w-0 items-baseline gap-1.5">
          <span className={`truncate text-[17px] leading-[1.42] font-medium ${ink}`}>
            {clause.text}
          </span>
          <ClauseLetters clause={clause} />
        </span>
      )}
    </span>
  );
}
