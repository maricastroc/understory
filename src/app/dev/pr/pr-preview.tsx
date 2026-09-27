"use client";

import type { DiffResult } from "@git-investigator/core/diff/types";
import { useMemo, useState } from "react";
import type { AuthUser } from "@/components/investigator/use-auth";
import { syntheticCases } from "@/components/line-investigation/fixtures/synthetic-cases";
import { PrInvestigation } from "@/components/pr-investigation/case/PrInvestigation";
import {
  SYNTHETIC_PR_NOW,
  syntheticPr944,
} from "@/components/pr-investigation/fixtures/synthetic-pr-944";
import * as states from "@/components/pr-investigation/fixtures/synthetic-pr-states";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { filterRail, lineRailItems, prRailItems } from "@/components/shell/rail-items";
import type { RailFilter } from "@/components/shell/types";

const NOW = Date.parse(SYNTHETIC_PR_NOW);
const SYNTHETIC_USER: AuthUser = { login: "synthetic", name: "Synthetic User", avatarUrl: "" };
const KEY = "synthetic/payments-service#944";

const STATES: Record<string, () => DiffResult> = {
  default: () => syntheticPr944,
  "all-silent": states.syntheticPrAllSilent,
  "evidence-only": states.syntheticPrEvidenceOnly,
  truncated: states.syntheticPrTruncated,
  legacy: states.syntheticPrLegacy,
  many: () => states.syntheticPrManyRegions(20),
  overlapping: states.syntheticPrOverlappingBands,
};

export function PrPreview({ state, user }: { state: string; user: string | null }) {
  const [filter, setFilter] = useState<RailFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const result = useMemo(() => (STATES[state] ?? STATES.default)(), [state]);
  const signedIn = user === "synthetic" ? SYNTHETIC_USER : null;
  const lineItems = useMemo(() => lineRailItems(syntheticCases, { activeId: null, now: NOW }), []);
  const prItems = useMemo(() => prRailItems([{ key: KEY, result }], KEY), [result]);

  return (
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={{
            name: result.repo.name ?? result.repo.path,
            detail: `#${result.pr.number} · ${result.pr.headSha.slice(0, 7)}`,
            url: result.repo.remoteUrl ?? null,
            connected: true,
          }}
          cases={[...lineItems, ...prItems]}
          onSelectCase={() => {}}
          fileSearch={null}
          crossLink="line"
          onNewInvestigation={() => {}}
          user={signedIn}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      strip={
        <CaseStrip
          items={filterRail(lineItems, prItems, filter)}
          expanded={menuOpen}
          onOpen={() => setMenuOpen(true)}
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
      <div className="min-w-0 px-8 pt-6 pb-20 max-[820px]:px-4">
        <PrInvestigation key={state} result={result} now={NOW} onDrill={() => {}} />
      </div>
    </AppShell>
  );
}
