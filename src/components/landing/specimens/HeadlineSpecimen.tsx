import type { ViewClause } from "../../line-investigation/model/types";
import { ClauseLetters } from "../../line-investigation/why/ClauseLetters";
import { ClauseRing } from "../../line-investigation/why/ClauseRing";

export function HeadlineSpecimen({ clause, silence }: { clause: ViewClause; silence: string }) {
  return (
    <div className="flex flex-col justify-center gap-2 text-sm font-medium">
      <p className="flex items-center gap-2 text-li-ink">
        <ClauseRing silent={false} filled />
        {clause.text}
        <ClauseLetters clause={clause} />
      </p>
      <p className="flex items-center gap-2 text-li-gap-ink">
        <ClauseRing silent filled={false} />
        {silence}
      </p>
    </div>
  );
}
