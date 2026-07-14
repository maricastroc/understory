import type { Evidence, VerifiedNarrative } from "@git-investigator/core/types";
import { letter } from "../format";
import { SectionLabel } from "../ui";
import { Claims } from "./Claims";
import { ConfidencePanel } from "./ConfidencePanel";
import { ContradictionAlert } from "./ContradictionAlert";
import { EntailmentQuotes } from "./EntailmentQuotes";
import { FabricationAlert } from "./FabricationAlert";
import { MisattributionAlert } from "./MisattributionAlert";
import { OutOfScopeCard } from "./OutOfScopeCard";
import { SourcesUsed } from "./SourcesUsed";
import { UncitedClaimsAlert } from "./UncitedClaimsAlert";
import { VerdictStrip } from "./VerdictStrip";

export function Findings({
  evidence,
  narrative,
}: {
  evidence: Evidence;
  narrative: VerifiedNarrative;
}) {
  if (narrative.answerable === false) {
    return <OutOfScopeCard answer={narrative.answer} />;
  }

  // Default for investigations persisted before claims existed — they render via the
  // plain-answer fallback below rather than throwing on a missing array.
  const claims = narrative.claims ?? [];
  const ungroundedClaims = narrative.ungroundedClaims ?? 0;

  const idToLetter = new Map(evidence.artifacts.map((a, i) => [a.id, letter(i)]));
  const byId = new Map(evidence.artifacts.map((a) => [a.id, a]));
  const resolved = narrative.citations.filter((id) => idToLetter.has(id));
  const citedSet = new Set(resolved);
  const contradictions = evidence.contradictions.filter((c) => citedSet.has(c.artifactId));

  const entailment = narrative.entailment;
  const checks = entailment?.checked ? entailment.checks : [];
  const statusById = new Map(checks.map((c) => [c.citation, c.status]));

  // The citation audit was expected here (grounded, recorded, with citations) but no
  // completed pass informed the score — it was disabled, rate-limited, or it threw.
  // Confidence is capped at medium; say so instead of implying a silent pass.
  const auditUnavailable =
    narrative.recorded && narrative.grounded && resolved.length > 0 && !entailment?.checked;

  return (
    <section className="mt-6">
      <SectionLabel
        title="Findings"
        meta="Reconstructed conclusion — every claim linked to a primary source"
      />

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        <VerdictStrip recorded={narrative.recorded} />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_216px]">
          <div className="border-b border-line p-7 md:border-r md:border-b-0">
            {claims.length > 0 ? (
              <Claims claims={claims} idToLetter={idToLetter} />
            ) : (
              <p className="max-w-[68ch] text-[16.5px] leading-[1.72] whitespace-pre-wrap text-[#2a2d36]">
                {narrative.answer}
              </p>
            )}
            <FabricationAlert ids={narrative.unknownCitations} />
            <UncitedClaimsAlert count={ungroundedClaims} />
            <MisattributionAlert checks={checks} idToLetter={idToLetter} />
            <ContradictionAlert contradictions={contradictions} idToLetter={idToLetter} />
            <SourcesUsed resolved={resolved} byId={byId} statusById={statusById} />
            <EntailmentQuotes checks={checks} byId={byId} idToLetter={idToLetter} />
          </div>

          <ConfidencePanel
            confidence={narrative.confidence}
            grounded={narrative.grounded}
            entailment={entailment}
            auditUnavailable={auditUnavailable}
          />
        </div>
      </div>
    </section>
  );
}
