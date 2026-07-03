import type { Evidence, VerifiedNarrative } from "@/lib/types";
import { ConfidenceRing } from "./ConfidenceRing";
import { letter } from "./format";
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

  return (
    <section className="mt-6">
      <SectionLabel title="Findings" meta="Reconstructed conclusion — every claim linked to a primary source" />

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
        {/* verdict strip */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-3">
          {narrative.recorded ? <Pill tone="good" dot>Resolved</Pill> : <Pill tone="warn" dot>Inconclusive</Pill>}
          <span className="text-[12.5px] font-semibold text-ink">
            {narrative.recorded ? "Rationale reconstructed" : "History is silent"}
            <span className="font-normal text-ink-2">
              {narrative.recorded
                ? " — grounded in the record below"
                : " — the record does not explain this"}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_244px]">
          {/* conclusion */}
          <div className="border-b border-line p-6 md:border-b-0 md:border-r">
            <p className="max-w-[64ch] whitespace-pre-wrap text-[15px] leading-[1.66] text-[#2a2d36]">
              {narrative.answer}
            </p>

            {narrative.unknownCitations.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-crit/25 bg-crit-tint px-3 py-2 text-[12.5px] text-crit">
                <Alert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {narrative.unknownCitations.length} fabricated citation
                  {narrative.unknownCitations.length > 1 ? "s" : ""} caught by verification:{" "}
                  <span className="font-mono">{narrative.unknownCitations.join(", ")}</span> — not in the
                  collected evidence.
                </span>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
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

          {/* confidence */}
          <div className="flex flex-col items-center gap-1 p-5 text-center">
            <ConfidenceRing confidence={narrative.confidence} />
            <div className="mt-2 max-w-[20ch] text-[12px] leading-snug text-ink-2">
              Confidence in reconstructed rationale
            </div>
            <div
              className={`mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${
                narrative.grounded ? "text-good" : "text-crit"
              }`}
            >
              {narrative.grounded ? <Check className="size-3.5" /> : <Alert className="size-3.5" />}
              {narrative.grounded ? "All citations grounded" : "Fabrication detected"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
