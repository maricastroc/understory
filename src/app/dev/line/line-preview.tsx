"use client";

import type { DigResult } from "@git-investigator/core/types";
import { LineInvestigation } from "@/components/line-investigation/case/LineInvestigation";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "@/components/line-investigation/fixtures/synthetic-charge-file";
import {
  SYNTHETIC_NOW,
  syntheticRetryCap,
} from "@/components/line-investigation/fixtures/synthetic-retry-cap";
import * as states from "@/components/line-investigation/fixtures/synthetic-states";
import type { SpecimenSlot } from "@/components/line-investigation/instrument/types";
import { CodeSpecimen } from "@/components/line-investigation/specimen/CodeSpecimen";
import { useSpecimenLayout } from "@/components/line-investigation/specimen/use-specimen-layout";
import { Search } from "@/components/icons";
import { AppHeader } from "@/components/shell/AppHeader";
import { HistorySidebar } from "@/components/shell/HistorySidebar";
import { CaseRow } from "@/components/sidebar/CaseRow";

const NOW = Date.parse(SYNTHETIC_NOW);

const STATES: Record<string, () => DigResult> = {
  resolved: () => syntheticRetryCap,
  pending: () => ({ evidence: syntheticRetryCap.evidence, narrative: null }),
  "not-recorded": states.syntheticNotRecorded,
  "evidence-only": states.syntheticEvidenceOnly,
  "out-of-scope": states.syntheticOutOfScope,
  fabricated: states.syntheticFabricated,
  misattributed: states.syntheticMisattributed,
  unverified: states.syntheticWithoutStageFourData,
  "commits-only": states.syntheticCommitsOnly,
  crowded: () => states.syntheticManyArtifacts(9),
};

export function LinePreview({ state }: { state: string }) {
  const layout = useSpecimenLayout();
  const result = (STATES[state] ?? STATES.resolved)();
  const loc = result.evidence.location!;
  const renderSpecimen: SpecimenSlot = (slot) => (
    <CodeSpecimen
      path={SYNTHETIC_FILE_PATH}
      lines={syntheticChargeLines}
      datum={{ start: loc.startLine, end: loc.endLine }}
      question={result.evidence.question}
      blame={syntheticChargeBlame}
      blameStatus="ready"
      now={NOW}
      {...slot}
    />
  );

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        mode="line"
        repoPath="synthetic/payments-service"
        filter=""
        onFilterChange={() => {}}
      />
      <div className="flex min-h-0 flex-1">
        <HistorySidebar
          ariaLabel="Investigations"
          label="Investigations"
          count={1}
          emptyIcon={<Search className="size-4.5" />}
          emptyTitle=""
          emptyBody=""
        >
          <CaseRow
            item={{
              caseId: "GI-2049",
              question: result.evidence.question,
              repoName: "synthetic/payments-service",
              location: "charge.ts:9",
              recorded: result.narrative?.recorded ?? false,
              answerable: result.narrative?.answerable !== false,
              hasNarrative: !!result.narrative,
              level: result.narrative?.confidence.level ?? "low",
              score: result.narrative?.confidence.score ?? 0,
              child: false,
              pending: state === "pending",
            }}
            active
            onSelect={() => {}}
            onRemove={() => {}}
          />
        </HistorySidebar>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-none px-4 py-5 pb-20 sm:px-6 sm:py-6 lg:px-8">
            <LineInvestigation
              key={state}
              result={result}
              pending={state === "pending"}
              now={NOW}
              layout={layout}
              renderSpecimen={renderSpecimen}
              onDrill={() => {}}
              onFollowUp={() => {}}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
