"use client";

import { useState } from "react";
import { CaseView } from "@/components/investigator/CaseView";
import { syntheticCases } from "@/components/line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "@/components/line-investigation/fixtures/synthetic-retry-cap";
import { RightRail } from "@/components/rail/RightRail";
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
      <div className="flex">
        <div className="mx-auto max-w-270 min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <CaseView entry={ANCHORED} onBack={() => {}} onDrill={() => {}} onOpenParent={() => {}} />
        </div>
        <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] self-start">
          <RightRail result={ANCHORED.result} />
        </div>
      </div>
    </AppShell>
  );
}
