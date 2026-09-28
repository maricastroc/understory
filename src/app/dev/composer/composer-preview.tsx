"use client";

import { useMemo, useState } from "react";
import { FileStage } from "@/components/composer/FileStage";
import {
  syntheticCaseCounts,
  syntheticMeta,
  syntheticOverview,
} from "@/components/composer/fixtures/synthetic-overview";
import { SYNTHETIC_MAP_STATES } from "@/components/composer/fixtures/synthetic-histories";
import { InvestigationPath } from "@/components/composer/InvestigationPath";
import { RepoStrip } from "@/components/composer/RepoStrip";
import { StageHeading } from "@/components/composer/StageHeading";
import type { PathStep } from "@/components/composer/types/path-step";
import {
  syntheticCases,
  syntheticPrCases,
} from "@/components/line-investigation/fixtures/synthetic-cases";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import {
  filterRail,
  lineRailItems,
  prRailItems,
  railFiltersUseful,
} from "@/components/shell/rail-items";
import type { RailFilter } from "@/components/shell/types";

const NOW = Date.parse("2026-09-27T12:00:00Z");

export function ComposerPreview({ state, files }: { state: string; files: number | null }) {
  const [filter, setFilter] = useState<RailFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const lineItems = useMemo(() => lineRailItems(syntheticCases, { activeId: null, now: NOW }), []);
  const prItems = useMemo(() => prRailItems(syntheticPrCases, null), []);
  const overview = useMemo(
    () =>
      state === "loading"
        ? null
        : files
          ? { ...syntheticOverview, files: syntheticOverview.files.slice(0, files) }
          : syntheticOverview,
    [state, files],
  );
  const map = useMemo(() => {
    const control = (SYNTHETIC_MAP_STATES[state] ?? SYNTHETIC_MAP_STATES.cold)();
    if (!files || !overview) return control;
    const shown = overview.files.map((f) => f.path);
    const states = new Map([...control.states].filter(([path]) => shown.includes(path)));
    const remaining = shown.filter((p) => !states.has(p)).length;
    return {
      ...control,
      states,
      mapped: [...states.values()].filter((s) => s.status === "mapped").length,
      mapping: [...states.values()].filter((s) => s.status === "mapping").length,
      remaining,
      mapMore: remaining ? control.mapMore : null,
    };
  }, [state, files, overview]);

  const steps: PathStep[] = [
    {
      key: "repo",
      label: "repository",
      value: "acme/payments-service",
      state: "done",
      onPick: () => {},
    },
    {
      key: "file",
      label: "file",
      value: null,
      state: "current",
      onPick: () => {},
    },
    { key: "line", label: "line", value: null, state: "next", onPick: null },
    {
      key: "question",
      label: "question",
      value: null,
      state: "next",
      onPick: null,
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
          showFilters={railFiltersUseful(lineItems, prItems)}
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
        <div className="flex flex-col gap-7 font-li-body text-li-ink">
          <div className="flex flex-col gap-4">
            <h1 className="font-li-mono text-[11px] tracking-[0.08em] text-li-text-subtle uppercase">
              New investigation
            </h1>
            <InvestigationPath steps={steps} />
          </div>
          <RepoStrip
            repoPath="acme/payments-service"
            meta={syntheticMeta}
            overview={overview}
            map={map}
          />
          <StageHeading
            title="Find the file"
            lead="Search for it, or pick one from the map below."
          />
          <FileStage
            overview={overview}
            overviewError={null}
            caseCounts={syntheticCaseCounts}
            query={query}
            onQuery={setQuery}
            results={[]}
            searching={false}
            map={map}
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
