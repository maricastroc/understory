import type { Artifact, CitationCheck } from "@understory/core/types";
import { Check } from "../icons";

export function EntailmentQuotes({
  checks,
  byId,
  idToLetter,
}: {
  checks: CitationCheck[];
  byId: Map<string, Artifact>;
  idToLetter: Map<string, string>;
}) {
  const proven = checks.filter((c) => c.status === "supported" && c.quote);
  if (proven.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        <Check className="size-3.5 text-good" />
        Substantiation · quoted verbatim from the source
      </div>
      <div className="flex flex-col gap-2.5">
        {proven.map((c) => {
          const a = byId.get(c.citation);
          return (
            <figure key={c.citation} className="rounded-md border border-line bg-inset px-3 py-2.5">
              <figcaption className="mb-1.5 text-[11.5px] font-medium text-ink-3">
                Exhibit {idToLetter.get(c.citation)} · {a?.ref ?? c.citation}
              </figcaption>
              <blockquote className="border-l-2 border-good pl-2.5 text-[12.5px] leading-relaxed text-ink-2 italic">
                “{c.quote}”
              </blockquote>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
