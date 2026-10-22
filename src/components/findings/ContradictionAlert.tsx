import { useMessages } from "@/i18n/LocaleProvider";
import type { Contradiction } from "@understory/core/types";
import { Alert } from "../icons";

export function ContradictionAlert({
  contradictions,
  idToLetter,
}: {
  contradictions: Contradiction[];
  idToLetter: Map<string, string>;
}) {
  const r = useMessages().report;
  if (contradictions.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2.5 text-[12.5px] text-crit">
      <div className="flex items-center gap-2 font-semibold">
        <Alert className="size-4 shrink-0" />
        {r.findings.contradicted(contradictions.length)}
      </div>
      <ul className="flex flex-col gap-1.5">
        {contradictions.map((c) => (
          <li key={`${c.artifactId}:${c.kind}`} className="flex gap-1.5">
            <span className="shrink-0 font-semibold">
              {r.exhibit(idToLetter.get(c.artifactId) ?? "")}
            </span>
            <span lang="en" className="opacity-90">
              {c.detail}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-[11.5px] opacity-80">{r.findings.contradictedNote}</div>
    </div>
  );
}
