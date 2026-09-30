"use client";

import { useState } from "react";
import { AnchoredInvestigation } from "@/components/line-investigation/case/AnchoredInvestigation";
import { syntheticCases } from "@/components/line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "@/components/line-investigation/fixtures/synthetic-retry-cap";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { lineRailItems } from "@/components/shell/rail-items";

const NOW = Date.parse(SYNTHETIC_NOW);
const ANCHORED = syntheticCases.find((c) => !c.result.evidence.location)!;

export function CasePreview() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = lineRailItems(syntheticCases, { activeId: ANCHORED.caseId, now: NOW });
  return (
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={null}
          cases={items}
          onSelectCase={() => {}}
          fileSearch={null}
          onNewInvestigation={() => {}}
          user={null}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      strip={<CaseStrip items={items} expanded={menuOpen} onOpen={() => setMenuOpen(true)} />}
      rail={(onClose) => (
        <CaseRail
          items={items}
          onSelect={() => {}}
          footer={railFooterInfo(null, false)}
          onClose={onClose}
        />
      )}
    >
      <div className="min-w-0 px-8 pt-6 pb-20 max-[820px]:px-4">
        <AnchoredInvestigation
          result={ANCHORED.result}
          pending={false}
          onDrill={() => {}}
          parent={
            ANCHORED.parentCaseId
              ? {
                  id: ANCHORED.parentCaseId,
                  question: ANCHORED.parentQuestion,
                  onOpen: () => {},
                }
              : undefined
          }
        />
      </div>
    </AppShell>
  );
}
