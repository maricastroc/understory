"use client";

import type { DigResult } from "@understory/core/types";
import { useMemo, useState } from "react";
import { CaseFailure } from "@/components/investigator/CaseFailure";
import type { AuthUser } from "@/components/investigator/use-auth";
import { LineInvestigation } from "@/components/line-investigation/case/LineInvestigation";
import type { CasePhase } from "@/components/line-investigation/case/types";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "@/components/line-investigation/fixtures/synthetic-charge-file";
import kept from "@/components/line-investigation/fixtures/kept-cases.json";
import { syntheticCases } from "@/components/line-investigation/fixtures/synthetic-cases";
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
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { lineRailItems } from "@/components/shell/rail-items";

const NOW = Date.parse(SYNTHETIC_NOW);
const ACTIVE = "GI-2049";
const SYNTHETIC_USER: AuthUser = { login: "synthetic", name: "Synthetic User", avatarUrl: "" };

const DRAFT: DigResult = {
  evidence: {
    ...syntheticRetryCap.evidence,
    repo: { path: syntheticRetryCap.evidence.repo.path },
    artifacts: [],
    contradictions: [],
    coverage: undefined,
  },
  narrative: null,
};

const PHASES: Record<string, CasePhase> = { collecting: "collecting", failed: "failed" };

const LONG_WHY = [
  "A função chargeCustomer foi criada para envolver a chamada à API da Stripe e repetir a cobrança quando a rede falha de forma transitória.",
  "O loop inicialmente era ilimitado, mas durante uma interrupção da Stripe ele reenviou cobranças e cobrou duas vezes 212 clientes; por isso o número de tentativas foi limitado a 3 com backoff exponencial (1 s, 2 s, 4 s) para garantir que a cobrança fosse concluída dentro da janela de ACK de 10 s do webhook da Stripe.",
  "A revisão cortou as cinco tentativas propostas para três.",
];

function longWhy(): DigResult {
  const narrative = syntheticRetryCap.narrative!;
  const claims = narrative.claims.map((c, i) => ({ ...c, text: LONG_WHY[i] ?? c.text }));
  return {
    ...syntheticRetryCap,
    narrative: { ...narrative, claims, answer: claims.map((c) => c.text).join(" ") },
  };
}

const STATES: Record<string, () => DigResult> = {
  resolved: () => syntheticRetryCap,
  "long-why": longWhy,
  collecting: () => DRAFT,
  failed: () => DRAFT,
  empty: states.syntheticNoHistory,
  pending: () => ({ evidence: syntheticRetryCap.evidence, narrative: null }),
  "not-recorded": states.syntheticNotRecorded,
  "evidence-only": states.syntheticEvidenceOnly,
  "out-of-scope": states.syntheticOutOfScope,
  fabricated: states.syntheticFabricated,
  misattributed: states.syntheticMisattributed,
  unverified: states.syntheticWithoutStageFourData,
  "commits-only": states.syntheticCommitsOnly,
  crowded: () => states.syntheticManyArtifacts(9),
  "many-owners": () => states.syntheticManyOwners(8),
};

const KEPT = kept.cases as unknown as Record<string, DigResult>;

export function LinePreview({
  state,
  user,
  reading = false,
}: {
  state: string;
  user: string | null;
  reading?: boolean;
}) {
  const layout = useSpecimenLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const phase = PHASES[state];
  const pending = state === "pending" || !!phase;
  const keptCase = state.startsWith("kept-") ? (KEPT[state.slice(5)] ?? null) : null;
  const result = keptCase ?? (STATES[state] ?? STATES.resolved)();
  const loc = result.evidence.location!;
  const signedIn = user === "synthetic" ? SYNTHETIC_USER : null;

  const entries = useMemo(
    () =>
      phase
        ? syntheticCases
        : syntheticCases.map((e) => (e.caseId === ACTIVE ? { ...e, result, pending } : e)),
    [result, pending, phase],
  );
  const lineItems = useMemo(
    () => lineRailItems(entries, { activeId: phase ? null : ACTIVE, now: NOW }),
    [entries, phase],
  );

  const renderSpecimen: SpecimenSlot = (slot) => (
    <CodeSpecimen
      path={keptCase ? loc.file : SYNTHETIC_FILE_PATH}
      lines={keptCase?.evidence.code?.lines ?? syntheticChargeLines}
      datum={
        keptCase?.evidence.code
          ? {
              start: loc.startLine - keptCase.evidence.code.startLine + 1,
              end: loc.endLine - keptCase.evidence.code.startLine + 1,
            }
          : { start: loc.startLine, end: loc.endLine }
      }
      question={result.evidence.question}
      blame={phase || state === "empty" || keptCase ? null : syntheticChargeBlame}
      blameStatus={phase === "collecting" ? "loading" : phase === "failed" ? "unpinned" : "ready"}
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
          cases={lineItems}
          onSelectCase={() => {}}
          fileSearch={null}
          onNewInvestigation={() => {}}
          user={signedIn}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      strip={<CaseStrip items={lineItems} expanded={menuOpen} onOpen={() => setMenuOpen(true)} />}
      rail={(onClose) => (
        <CaseRail
          items={lineItems}
          onSelect={() => setMenuOpen(false)}
          onRemove={() => {}}
          footer={railFooterInfo(signedIn, !!signedIn)}
          onClose={onClose}
        />
      )}
    >
      <div className="min-w-0 px-8 pt-6 pb-20 max-[820px]:px-4">
        <LineInvestigation
          key={state}
          result={result}
          pending={pending}
          now={NOW}
          layout={layout}
          renderSpecimen={renderSpecimen}
          onDrill={() => {}}
          onFollowUp={() => {}}
          onBackToQuestion={() => {}}
          reading={reading}
          phase={phase}
          failure={
            phase === "failed" ? (
              <CaseFailure
                message="Request failed (502)"
                signedIn={!!signedIn}
                onRetry={() => {}}
                onBack={() => {}}
              />
            ) : undefined
          }
        />
      </div>
    </AppShell>
  );
}
