import type { ViewClause } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";

const MAX = 4;

export function ClauseLetters({ clause }: { clause: ViewClause }) {
  const letters = clause.letters.length > MAX ? clause.letters.slice(0, 3) : clause.letters;
  const extra = clause.letters.length - letters.length;
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5 align-[1px]">
      {letters.map((l) => (
        <EvidenceLetter key={l} letter={l} variant="cited" size="sm" />
      ))}
      {extra > 0 && (
        <span className="font-li-mono text-[10.5px] text-li-text-subtle">+{extra}</span>
      )}
      {clause.unknownCitations.map((id) => (
        <s key={id} className="font-li-mono text-[10.5px] text-li-text-muted">
          {id}
        </s>
      ))}
    </span>
  );
}
