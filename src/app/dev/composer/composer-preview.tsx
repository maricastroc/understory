"use client";

import { useMemo, useState } from "react";
import { ComposerTitle } from "@/components/composer/ComposerTitle";
import { FileStage } from "@/components/composer/FileStage";
import {
  syntheticCaseCounts,
  syntheticMeta,
  syntheticOverview,
} from "@/components/composer/fixtures/synthetic-overview";
import type { TrailSlot } from "@/components/composer/types/trail-slot";
import {
  syntheticCases,
  syntheticPrCases,
} from "@/components/line-investigation/fixtures/synthetic-cases";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { filterRail, lineRailItems, prRailItems } from "@/components/shell/rail-items";
import type { RailFilter } from "@/components/shell/types";

const NOW = Date.parse("2026-09-27T12:00:00Z");

export function ComposerPreview({ state }: { state: string }) {
  const [filter, setFilter] = useState<RailFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const lineItems = useMemo(() => lineRailItems(syntheticCases, { activeId: null, now: NOW }), []);
  const prItems = useMemo(() => prRailItems(syntheticPrCases, null), []);
  const overview = state === "loading" ? null : syntheticOverview;

  const slots: TrailSlot[] = [
    {
      key: "repo",
      text: "acme/payments-service",
      filled: true,
      current: false,
      enabled: true,
      dot: true,
      onPick: () => {},
    },
    { key: "file", text: "file", filled: false, current: true, enabled: true, onPick: () => {} },
    { key: "line", text: "line", filled: false, current: false, enabled: false, onPick: () => {} },
    {
      key: "question",
      text: "question",
      filled: false,
      current: false,
      enabled: false,
      onPick: () => {},
    },
  ];

  return (
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={{ name: "payments-service", detail: "main", url: null, connected: true }}
          cases={[...lineItems, ...prItems]}
          onSelectCase={() => {}}
          fileSearch={null}
          crossLink="pr"
          onNewInvestigation={() => {}}
          user={null}
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
          footer={railFooterInfo(null, false)}
          onClose={onClose}
        />
      )}
    >
      <div className="min-w-0 flex-1 px-8 pt-6 pb-20 max-[820px]:px-4">
        <div className="flex flex-col gap-5.5 font-li-body text-li-ink">
          <ComposerTitle slots={slots} />
          <FileStage
            meta={syntheticMeta}
            overview={overview}
            overviewError={null}
            caseCounts={syntheticCaseCounts}
            query={query}
            onQuery={setQuery}
            results={[]}
            searching={false}
            onOpen={setOpened}
          />
          {opened && (
            <p role="status" className="font-li-mono text-xs">
              opened {opened}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
