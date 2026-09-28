import { displayId } from "../../line-investigation/copy/artifact-copy";
import type { InvestigationView } from "../../line-investigation/model/types";
import { ClauseLetters } from "../../line-investigation/why/ClauseLetters";
import { GlyphIcon } from "../parts/GlyphIcon";

export function ClauseSpecimen({ view, index }: { view: InvestigationView; index: number }) {
  const clause = view.clauses[index];
  const cited = clause.citations
    .map((id) => view.artifacts.find((a) => a.id === id))
    .filter((a) => !!a);
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[15px] font-medium text-li-ink">
        {clause.text} <ClauseLetters clause={clause} />
      </p>
      <ul className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 border-l-2 border-li-evidence pl-3 font-li-mono text-[11.5px] text-li-ink">
        {cited.map((a) => (
          <li key={a.id} className="contents">
            <GlyphIcon kind={a.kind} cited={a.role === "cited"} />
            <span>
              {a.letter} · {displayId(a)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
