import type { CitationCheck } from "@understory/core/types";
import { Alert } from "../icons";

export function MisattributionAlert({
  checks,
  idToLetter,
}: {
  checks: CitationCheck[];
  idToLetter: Map<string, string>;
}) {
  const bad = checks.filter((c) => c.status === "unsupported");
  if (bad.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2.5 text-[12.5px] text-crit">
      <div className="flex items-center gap-2 font-semibold">
        <Alert className="size-4 shrink-0" />
        {bad.length === 1
          ? "A cited source doesn't substantiate the claim"
          : `${bad.length} cited sources don't substantiate the claim`}
      </div>
      <ul className="flex flex-col gap-1.5">
        {bad.map((c) => (
          <li key={c.citation} className="flex gap-1.5">
            <span className="shrink-0 font-semibold">Exhibit {idToLetter.get(c.citation)}</span>
            <span className="opacity-90">{c.reason}</span>
          </li>
        ))}
      </ul>
      <div className="text-[11.5px] opacity-80">
        The citation id is real, but the source text does not back the claim — checked by
        entailment, so it does not count as support.
      </div>
    </div>
  );
}
