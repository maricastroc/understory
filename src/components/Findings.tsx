import type { Evidence, VerifiedNarrative } from "@/lib/types";
import { ConfidenceRing } from "./ConfidenceRing";
import { letter, levelLabel } from "./format";
import { Alert, Check } from "./icons";
import { Pill, SectionLabel } from "./ui";

export function Findings({
  evidence,
  narrative,
}: {
  evidence: Evidence;
  narrative: VerifiedNarrative;
}) {
  const idToLetter = new Map(evidence.artifacts.map((a, i) => [a.id, letter(i)]));
  const resolved = narrative.citations.filter((id) => idToLetter.has(id));

  const citedSet = new Set(resolved);
  const contradictions = evidence.contradictions.filter((c) => citedSet.has(c.artifactId));

  return (
    <section className="mt-6">
      <SectionLabel
        title="Findings"
        meta="Reconstructed conclusion — every claim linked to a primary source"
      />

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        {/* verdict strip — reads as the conclusion header, not just another card */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2 px-6 py-3.5">
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full ${
              narrative.recorded ? "bg-good-tint text-good" : "bg-warn-tint text-warn"
            }`}
          >
            {narrative.recorded ? <Check className="size-3.5" /> : <Alert className="size-3.5" />}
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-ink">
            {narrative.recorded ? "Investigation conclusion" : "No conclusion on record"}
          </span>
          <Pill tone={narrative.recorded ? "good" : "warn"} dot>
            {narrative.recorded ? "Resolved" : "Inconclusive"}
          </Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_216px]">
          {/* conclusion — the answer is the hero: larger type, wider column, more air */}
          <div className="border-b border-line p-7 md:border-r md:border-b-0">
            <p className="max-w-[68ch] text-[16.5px] leading-[1.72] whitespace-pre-wrap text-[#2a2d36]">
              {narrative.answer}
            </p>

            {narrative.unknownCitations.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2 text-[12.5px] text-crit">
                <Alert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {narrative.unknownCitations.length} fabricated citation
                  {narrative.unknownCitations.length > 1 ? "s" : ""} caught by verification:{" "}
                  <span className="font-mono">{narrative.unknownCitations.join(", ")}</span> — not
                  in the collected evidence.
                </span>
              </div>
            )}

            {contradictions.length > 0 && (
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
                      <span className="shrink-0 font-semibold">
                        Exhibit {idToLetter.get(c.artifactId)}
                      </span>
                      <span className="opacity-90">{c.detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11.5px] opacity-80">
                  The recorded reason was later undone or declined — confidence is lowered
                  accordingly.
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Grounded in
                </div>
                <div className="flex flex-wrap gap-2">
                  {resolved.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 text-[12px]"
                    >
                      <Check className="size-3.5 text-good" />
                      <span className="font-semibold">Exhibit {idToLetter.get(id)}</span>
                      <span className="font-mono text-ink-3">{id}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* confidence — smaller ring, the reading gets the weight */}
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <ConfidenceRing confidence={narrative.confidence} size={88} />
            <div className="flex flex-col items-center gap-1">
              <div className="text-[15px] font-semibold tracking-tight text-ink">
                {levelLabel[narrative.confidence.level]} confidence
              </div>
              <div
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                  narrative.grounded ? "text-good" : "text-crit"
                }`}
              >
                {narrative.grounded ? (
                  <Check className="size-3.5" />
                ) : (
                  <Alert className="size-3.5" />
                )}
                {narrative.grounded ? "Every citation grounded" : "Fabrication detected"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
