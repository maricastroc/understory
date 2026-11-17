"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { useMemo, useState } from "react";
import { CodeContext } from "@/components/composer/CodeContext";
import { CodeViewer } from "@/components/composer/CodeViewer";
import { QuestionForm } from "@/components/composer/QuestionForm";
import { stageCopy } from "@/components/composer/stage-copy";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeLines,
} from "@/components/line-investigation/fixtures/synthetic-charge-file";
import { datumToken } from "@/components/line-investigation/specimen/datum-token";
import { useLocale } from "@/i18n/LocaleProvider";
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
import { syntheticCases } from "@/components/line-investigation/fixtures/synthetic-cases";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppShell } from "@/components/shell/AppShell";
import { CaseRail } from "@/components/shell/CaseRail";
import { CaseStrip } from "@/components/shell/CaseStrip";
import { railFooterInfo } from "@/components/shell/rail-footer-info";
import { lineRailItems } from "@/components/shell/rail-items";

const NOW = Date.parse("2026-09-27T12:00:00Z");

export function ComposerPreview({
  state,
  files,
  stage = "file",
}: {
  state: string;
  files: number | null;
  stage?: "file" | "code";
}) {
  const locale = useLocale();
  const [selected, setSelected] = useState<number | null>(9);
  const [question, setQuestion] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const m = useMessages();
  const lineItems = useMemo(
    () => lineRailItems(syntheticCases, { activeId: null, now: NOW, m }),
    [m],
  );
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

  const coding = stage === "code";
  const lineValue = selected ? m.composer.lines(selected, selected) : null;
  const askedRange =
    coding && selected && question.trim()
      ? datumToken(question, syntheticChargeLines[selected - 1] ?? "")
      : null;
  const copy = stageCopy(
    {
      stage: coding ? "code" : "file",
      connecting: false,
      fileLoading: false,
      about: coding && selected ? m.composer.theLines(selected, selected) : null,
    },
    locale,
  );
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
      value: coding ? SYNTHETIC_FILE_PATH : null,
      state: coding ? "done" : "current",
      onPick: () => {},
    },
    {
      key: "line",
      label: "line",
      value: coding ? lineValue : null,
      state: !coding ? "next" : selected ? "done" : "current",
      onPick: coding ? () => setSelected(null) : null,
    },
    {
      key: "question",
      label: "question",
      value: null,
      state: coding && selected ? "current" : "next",
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
          cases={lineItems}
          onSelectCase={() => {}}
          fileSearch={null}
          onNewInvestigation={() => {}}
          user={null}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      strip={<CaseStrip items={lineItems} expanded={menuOpen} onOpen={() => setMenuOpen(true)} />}
      rail={(onClose) => (
        <CaseRail
          items={lineItems}
          onSelect={() => setMenuOpen(false)}
          onRemove={() => {}}
          footer={railFooterInfo(null, false, m)}
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
          <StageHeading title={copy.title} lead={copy.lead} />
          {coding ? (
            <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-8 max-[1280px]:grid-cols-1">
              <CodeViewer
                file={{ path: SYNTHETIC_FILE_PATH, lines: syntheticChargeLines }}
                selectedStart={selected}
                selectedEnd={selected}
                enclosing={null}
                onSelect={(n) => setSelected(n)}
                asked={askedRange}
              />
              <CodeContext
                repoPath=".demo/payments-service"
                path={SYNTHETIC_FILE_PATH}
                lineCount={syntheticChargeLines.length}
                head={null}
                fileState={undefined}
                prData="github"
                selection={selected ? { start: selected, end: selected } : null}
              >
                {selected && (
                  <QuestionForm
                    target={m.composer.theLines(selected, selected)}
                    runLabel={m.composer.investigate(m.composer.theLines(selected, selected))}
                    question={question}
                    setQuestion={setQuestion}
                    onRun={() => {}}
                    wider={null}
                    onRunWider={() => {}}
                    asked={
                      askedRange
                        ? {
                            token: syntheticChargeLines[selected - 1].slice(
                              askedRange.start,
                              askedRange.end,
                            ),
                            line: selected,
                          }
                        : null
                    }
                  />
                )}
              </CodeContext>
            </div>
          ) : (
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
          )}
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
