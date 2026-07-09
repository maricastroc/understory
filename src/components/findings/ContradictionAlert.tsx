import type { Contradiction } from "@git-investigator/core/types";
import { Alert } from "../icons";

export function ContradictionAlert({
  contradictions,
  idToLetter,
}: {
  contradictions: Contradiction[];
  idToLetter: Map<string, string>;
}) {
  if (contradictions.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2.5 text-[12.5px] text-crit">
      <div className="flex items-center gap-2 font-semibold">
        <Alert className="size-4 shrink-0" />
        {contradictions.length === 1
          ? "A cited source is contradicted by later history"
          : `${contradictions.length} cited sources are contradicted by later history`}
      </div>
      <ul className="flex flex-col gap-1.5">
        {contradictions.map((c) => (
          <li key={`${c.artifactId}:${c.kind}`} className="flex gap-1.5">
            <span className="shrink-0 font-semibold">Exhibit {idToLetter.get(c.artifactId)}</span>
            <span className="opacity-90">{c.detail}</span>
          </li>
        ))}
      </ul>
      <div className="text-[11.5px] opacity-80">
        The recorded reason was later undone or declined — confidence is lowered accordingly.
      </div>
    </div>
  );
}
