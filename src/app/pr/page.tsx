"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useExplainDiff } from "@/components/diff/use-explain-diff";
import { PrComposer } from "@/components/pr/PrComposer";
import { entryKey } from "@/components/pr/pr-entry";
import { usePrHistory } from "@/components/pr/use-pr-history";
import { useAuth } from "@/components/investigator/use-auth";
import type { Entry } from "@/components/investigator/use-investigation";
import { fetchSavedCases } from "@/components/investigator/saved-cases";
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
import type { RailFilter, RailItem, RepoSummary } from "@/components/shell/types";
import { useLanguage } from "@/components/use-language";
import { toArtifactRef } from "@/components/format";
import type { ViewArtifact } from "@/components/line-investigation/model/types";
import { PrInvestigation } from "@/components/pr-investigation/case/PrInvestigation";

export default function PrPage() {
  const user = useAuth();
  const [pr, setPr] = useState("");
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { language } = useLanguage();
  const { loading, error, result, run } = useExplainDiff();
  const { entries, activeKey, active, select, remove, hydrated } = usePrHistory(result);
  const router = useRouter();
  const [filter, setFilter] = useState<RailFilter>("all");
  const [lineCases, setLineCases] = useState<Entry[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [now] = useState(() => Date.now());
  const [seenError, setSeenError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSavedCases().then(({ cases, persisted: synced }) => {
      if (!alive) return;
      setPersisted(synced);
      setLineCases(
        cases.map((c) => ({
          caseId: c.caseId,
          form: { repoPath: c.repoPath, location: c.location, question: c.question },
          result: c.result,
          ...(c.parentCaseId ? { parentCaseId: c.parentCaseId } : {}),
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const gh = () => token.trim() || undefined;
  const runPr = (value = pr) => {
    if (value.trim()) void run(value, language, gh());
  };
  const tryExample = (example: string) => {
    setPr(example);
    runPr(example);
  };

  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) {
      firstLang.current = false;
      return;
    }
    if (pr.trim() && active && !loading) void run(pr, language, gh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const activeResult = active?.result ?? null;

  const didDeepLink = useRef(false);
  useEffect(() => {
    if (!hydrated || didDeepLink.current) return;
    didDeepLink.current = true;
    const deep = new URLSearchParams(window.location.search).get("pr");
    if (!deep) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    if (entries.some((e) => e.key === deep)) {
      select(deep);
    } else {
      setPr(deep);
      void run(deep, language, gh());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!didDeepLink.current) return;
    const params = new URLSearchParams(window.location.search);
    if (activeResult) params.set("pr", entryKey(activeResult));
    else params.delete("pr");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [activeResult]);

  const lineItems = useMemo(
    () => lineRailItems(lineCases, { activeId: null, now }),
    [lineCases, now],
  );
  const prItems = useMemo(() => prRailItems(entries, activeKey), [entries, activeKey]);

  function openRailItem(item: RailItem) {
    setMenuOpen(false);
    setSeenError(error);
    if (item.kind === "line") router.push(`/app?case=${encodeURIComponent(item.id)}`);
    else select(item.id);
  }

  function newInvestigation() {
    setSeenError(error);
    setPr("");
    select(null);
  }

  const showError = !!error && error !== seenError;
  const showCase = !!activeResult && !loading && !showError;
  const canDrill = !!activeResult && (activeResult.repo.remoteUrl ?? "").includes("github.com");

  function drill(a: ViewArtifact) {
    if (!activeResult || !activeKey) return;
    const params = new URLSearchParams({
      drill: JSON.stringify(toArtifactRef(a.source)),
      repo: activeResult.repo.path,
      parent: activeKey,
      title: activeResult.pr.title,
    });
    router.push(`/app?${params.toString()}`);
  }

  function removeRailItem(item: RailItem) {
    if (item.kind === "pr") {
      remove(item.id);
      return;
    }
    setLineCases((prev) => prev.filter((c) => c.caseId !== item.id));
    void fetch(`/api/investigations/${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  const repoSummary: RepoSummary | null = activeResult
    ? {
        name: activeResult.repo.name ?? activeResult.repo.path,
        detail: `#${activeResult.pr.number} · ${activeResult.pr.headSha.slice(0, 7)}`,
        url: activeResult.repo.remoteUrl ?? null,
        connected: true,
      }
    : null;

  return (
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={repoSummary}
          cases={[...lineItems, ...prItems]}
          onSelectCase={openRailItem}
          fileSearch={null}
          crossLink="line"
          onNewInvestigation={newInvestigation}
          user={user}
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
          onNew={() => router.push("/app")}
          filter={filter}
          onFilter={setFilter}
          onSelect={openRailItem}
          onRemove={removeRailItem}
          footer={railFooterInfo(user, persisted)}
          onClose={onClose}
        />
      )}
    >
      {showCase && activeResult ? (
        <div className="min-w-0 px-8 pt-6 pb-20 max-[820px]:px-4">
          <PrInvestigation
            key={activeKey ?? "pr"}
            result={activeResult}
            now={now}
            onDrill={canDrill ? drill : undefined}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-270 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <PrComposer
            pr={pr}
            setPr={setPr}
            token={token}
            setToken={setToken}
            loading={loading}
            error={showError ? error : null}
            onRun={() => runPr()}
            onExample={tryExample}
            signedIn={!!user}
          />
        </div>
      )}
    </AppShell>
  );
}
