"use client";

import type { DigResult } from "@git-investigator/core/types";
import { useMemo, useState } from "react";
import type { AuthUser } from "@/components/investigator/use-auth";
import { LineInvestigation } from "@/components/line-investigation/case/LineInvestigation";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "@/components/line-investigation/fixtures/synthetic-charge-file";
import {
  syntheticCases,
  syntheticPrCases,
} from "@/components/line-investigation/fixtures/synthetic-cases";
import {
  SYNTHETIC_NOW,
  syntheticRetryCap,
} from "@/components/line-investigation/fixtures/synthetic-retry-cap";
import * as states from "@/components/line-investigation/fixtures/synthetic-states";
import type { SpecimenSlot } from "@/components/line-investigation/instrument/types";
import { CodeSpecimen } from "@/components/line-investigation/specimen/CodeSpecimen";
import { useSpecimenLayout } from "@/components/line-investigation/specimen/use-specimen-layout";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { filterRail, lineRailItems, prRailItems } from "@/components/shell/rail-items";
import type { RailFilter } from "@/components/shell/types";

const NOW = Date.parse(SYNTHETIC_NOW);
const ACTIVE = "GI-2049";
const SYNTHETIC_USER: AuthUser = { login: "synthetic", name: "Synthetic User", avatarUrl: "" };

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

export function LinePreview({ state, user }: { state: string; user: string | null }) {
  const layout = useSpecimenLayout();
  const [filter, setFilter] = useState<RailFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const pending = state === "pending";
  const result = (STATES[state] ?? STATES.resolved)();
  const loc = result.evidence.location!;
  const signedIn = user === "synthetic" ? SYNTHETIC_USER : null;

  const entries = useMemo(
    () => syntheticCases.map((e) => (e.caseId === ACTIVE ? { ...e, result, pending } : e)),
    [result, pending],
  );
  const lineItems = useMemo(
    () => lineRailItems(entries, { activeId: ACTIVE, now: NOW }),
    [entries],
  );
  const prItems = useMemo(() => prRailItems(syntheticPrCases, null), []);

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
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={{
            name: result.evidence.repo.name ?? "payments-service",
            detail: [result.evidence.repo.branch, result.evidence.repo.sha?.slice(0, 7)]
              .filter(Boolean)
              .join(" · "),
            url: result.evidence.repo.remoteUrl ?? null,
            connected: true,
          }}
          onNewInRepo={() => {}}
          cases={[...lineItems, ...prItems]}
          onSelectCase={() => {}}
          fileSearch={null}
          crossLink="pr"
          onNewInvestigation={() => {}}
          user={signedIn}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      rail={(onClose) => (
        <CaseRail
          items={filterRail(lineItems, prItems, filter)}
          filter={filter}
          onFilter={setFilter}
          onSelect={() => setMenuOpen(false)}
          onRemove={() => {}}
          footer={railFooterInfo(signedIn, !!signedIn)}
          onClose={onClose}
        />
      )}
    >
      <div className="min-w-0 px-8 pt-6 pb-20 max-[767px]:px-4">
        <LineInvestigation
          key={state}
          result={result}
          pending={pending}
          now={NOW}
          layout={layout}
          renderSpecimen={renderSpecimen}
          onDrill={() => {}}
          onFollowUp={() => {}}
        />
      </div>
    </AppShell>
  );
}
