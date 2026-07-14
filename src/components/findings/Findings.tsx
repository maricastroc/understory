"use client";

import { cosmeticOrigin } from "@git-investigator/core/cosmetic";
import { traceProvenance } from "@git-investigator/core/provenance";
import type { Evidence, VerifiedNarrative } from "@git-investigator/core/types";
import { CopyButton } from "../CopyButton";
import { letter } from "../format";
import { useLanguage } from "../use-language";
import { SectionLabel } from "../ui";
import { Claims } from "./Claims";
import { ConfidencePanel } from "./ConfidencePanel";
import { ContradictionAlert } from "./ContradictionAlert";
import { EntailmentQuotes } from "./EntailmentQuotes";
import { FabricationAlert } from "./FabricationAlert";
import { MisattributionAlert } from "./MisattributionAlert";
import { OriginTrace } from "./OriginTrace";
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
  const { language } = useLanguage();

  if (narrative.answerable === false) {
    return <OutOfScopeCard answer={narrative.answer} />;
  }

  const claims = narrative.claims ?? [];
  const ungroundedClaims = narrative.ungroundedClaims ?? 0;

  const idToLetter = new Map(evidence.artifacts.map((a, i) => [a.id, letter(i)]));
  const byId = new Map(evidence.artifacts.map((a) => [a.id, a]));
  const provenance = traceProvenance(evidence);
  const cosmetic = cosmeticOrigin(evidence);
  const resolved = narrative.citations.filter((id) => idToLetter.has(id));
  const citedSet = new Set(resolved);
  const contradictions = evidence.contradictions.filter((c) => citedSet.has(c.artifactId));

  const entailment = narrative.entailment;
  const checks = entailment?.checked ? entailment.checks : [];
  const statusById = new Map(checks.map((c) => [c.citation, c.status]));

  const auditUnavailable =
    narrative.recorded && narrative.grounded && resolved.length > 0 && !entailment?.checked;

  const coarseGranularity = evidence.coverage?.granularity === "file";

  return (
    <section className="mt-6">
      <div className="flex items-start justify-between gap-3">
        <SectionLabel
          title="Findings"
          meta="Reconstructed conclusion — every claim linked to a primary source"
        />
        {narrative.answer && <CopyButton text={narrative.answer} label="Copy the why" />}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
        <VerdictStrip recorded={narrative.recorded} />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_216px]">
          <div className="border-b border-line p-7 md:border-r md:border-b-0">
            {claims.length > 0 ? (
              <Claims claims={claims} idToLetter={idToLetter} />
            ) : (
              <p
                lang={language}
                className="max-w-[68ch] text-[16.5px] leading-[1.72] whitespace-pre-wrap text-ink-body"
              >
                {narrative.answer}
              </p>
            )}
            {provenance && <OriginTrace provenance={provenance} byId={byId} />}
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
            coarseGranularity={coarseGranularity}
            cosmeticRef={cosmetic?.ref}
          />
        </div>
      </div>
    </section>
  );
}
