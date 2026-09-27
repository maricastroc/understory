"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorState } from "../ErrorState";
import { Composer } from "../composer/Composer";
import type { ComposerPrefill } from "../composer/composer-prefill";
import { useRepo } from "../composer/use-repo";
import { LiveLineInvestigation } from "../line-investigation/case/LiveLineInvestigation";
import { usePrHistory } from "../pr/use-pr-history";
import { RailContent, RightRail } from "../rail/RightRail";
import { AppHeader } from "../shell/AppHeader";
import { AppShell } from "../shell/AppShell";
import { CaseRail } from "../shell/CaseRail";
import { CaseStrip } from "../shell/CaseStrip";
import { railFooterInfo } from "../shell/rail-footer-info";
import { repoDisplayName } from "../shell/repo-display-name";
import { filterRail, lineRailItems, prRailItems } from "../shell/rail-items";
import type { RailFilter, RailItem, RepoSummary } from "../shell/types";
import { useLanguage } from "../use-language";
import { CaseFailure } from "./CaseFailure";
import { CaseView } from "./CaseView";
import { draftResult } from "./draft-result";
import type { FollowUpParent } from "./follow-up-parent";
import { LoadingCard } from "./LoadingCard";
import { Onboarding } from "./Onboarding";
import { useAuth } from "./use-auth";
import { type Entry, useInvestigation } from "./use-investigation";

export function Investigator() {
  const user = useAuth();
  const {
    repoPath,
    setRepoPath,
    loading,
    error,
    history,
    loaded,
    persisted,
    activeId,
    view,
    draft,
    resetKey,
    current,
    browsing,
    investigate,
    drillInto,
    retryDraft,
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  } = useInvestigation(user);

  const repo = useRepo();
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useLanguage();
  const prHistory = usePrHistory(null);
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<RailFilter>("all");
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(null);
  const [followParent, setFollowParent] = useState<FollowUpParent | null>(null);
  const [now] = useState(() => Date.now());
  const deepCase = useRef(false);
  const prefillNonce = useRef(0);

  useEffect(() => {
    const deepRepo = params.get("repo");
    const deepFile = params.get("file");
    const deepLine = params.get("line");
    if (deepRepo && deepFile && deepLine) {
      setRepoPath(deepRepo);
      void repo.open(deepRepo);
      void investigate(
        {
          repoPath: deepRepo,
          location: `${deepFile}:${deepLine}`,
          question: "Why is this line the way it is? Reconstruct why it changed.",
        },
        undefined,
        language,
      );
    } else {
      void repo.open(repoPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = params.get("case");
    if (!loaded || !id || deepCase.current) return;
    deepCase.current = true;
    selectCase(id);
  }, [loaded, params, selectCase]);

  const tokenValue = token.trim() || undefined;
  const collecting = !!draft && !draft.error;
  const busy = loading && !collecting;
  const draftCase = view === "case" && !current && draft ? draftResult(draft.form) : null;
  const lineCase = view === "case" && !busy && !draftCase && !!current?.result.evidence.location;
  const railResult =
    view === "case" && !busy && !lineCase && !draftCase ? (current?.result ?? null) : null;
  const railMeta = browsing && repo.ready ? repo.meta : null;
  const activeCaseId = view === "case" ? activeId : null;

  const lineItems = useMemo(
    () => lineRailItems(history, { activeId: activeCaseId, now }),
    [history, activeCaseId, now],
  );
  const prItems = useMemo(() => prRailItems(prHistory.entries, null), [prHistory.entries]);
  const railItems = filterRail(lineItems, prItems, filter);

  function openRailItem(item: RailItem) {
    setMenuOpen(false);
    if (item.kind === "pr") router.push(`/pr?pr=${encodeURIComponent(item.id)}`);
    else selectCase(item.id);
  }

  function removeRailItem(item: RailItem) {
    if (item.kind === "pr") prHistory.remove(item.id);
    else removeCase(item.id);
  }

  function startInRepo(path: string) {
    setFollowParent(null);
    newInvestigation();
    setRepoPath(path);
    void repo.open(path, tokenValue);
  }

  function followUp(entry: Entry) {
    const loc = entry.result.evidence.location;
    if (!loc) return;
    const target = entry.form.repoPath;
    if (target !== repoPath || !repo.ready) {
      setRepoPath(target);
      void repo.open(target, tokenValue);
    }
    setFollowParent({
      caseId: entry.caseId,
      question: entry.form.question || entry.result.evidence.question,
      path: loc.file,
    });
    setPrefill({ path: loc.file, line: loc.startLine, nonce: ++prefillNonce.current });
    backToCode();
  }

  function openFile(path: string) {
    setPrefill({ path, nonce: ++prefillNonce.current });
    backToCode();
  }

  function handleNewInvestigation() {
    setFollowParent(null);
    setRepoPath("");
    setToken("");
    repo.reset();
    newInvestigation();
  }

  const repoSummary: RepoSummary | null = (() => {
    if (view === "case" && current) {
      const r = current.result.evidence.repo;
      const detail = [r.branch, r.sha?.slice(0, 7)].filter(Boolean).join(" · ");
      return {
        name: repoDisplayName(r.name ?? current.form.repoPath),
        detail: detail || null,
        url: r.remoteUrl ?? null,
        connected: true,
      };
    }
    if (!repoPath.trim()) return null;
    return {
      name: repoDisplayName(repo.meta?.name ?? repoPath),
      detail: repo.meta?.branch ?? null,
      url: repo.meta?.htmlUrl ?? null,
      connected: repo.ready,
    };
  })();
  const summaryRepoPath = view === "case" && current ? current.form.repoPath : repoPath;

  const drill = (entry: Entry) => (anchor: Parameters<typeof drillInto>[2]) =>
    drillInto(
      entry.caseId,
      entry.form.question || "Why is this line the way it is?",
      anchor,
      entry.form.repoPath,
      tokenValue,
      language,
    );

  return (
    <AppShell
      drawerOpen={menuOpen}
      onCloseDrawer={() => setMenuOpen(false)}
      header={
        <AppHeader
          repo={repoSummary}
          onNewInRepo={summaryRepoPath.trim() ? () => startInRepo(summaryRepoPath) : undefined}
          cases={[...lineItems, ...prItems]}
          onSelectCase={openRailItem}
          fileSearch={
            repoPath.trim() && repo.ready ? { repoPath, enabled: true, token: tokenValue } : null
          }
          onOpenFile={openFile}
          crossLink="pr"
          onNewInvestigation={handleNewInvestigation}
          user={user}
          onMenuClick={() => setMenuOpen(true)}
        />
      }
      strip={<CaseStrip items={railItems} expanded={menuOpen} onOpen={() => setMenuOpen(true)} />}
      rail={(onClose) => (
        <CaseRail
          items={railItems}
          filter={filter}
          onFilter={setFilter}
          onSelect={openRailItem}
          onRemove={removeRailItem}
          footer={railFooterInfo(user, persisted)}
          onClose={onClose}
        />
      )}
    >
      <div className="flex">
        <div
          className={
            lineCase || draftCase
              ? "min-w-0 flex-1 px-8 pt-6 pb-20 max-[820px]:px-4"
              : "mx-auto max-w-270 min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
          }
        >
          {error && browsing && (
            <div className="mb-4">
              <ErrorState message={error} signedIn={!!user} />
            </div>
          )}

          <div className={browsing ? "" : "hidden"}>
            {history.length === 0 && <Onboarding repoReady={repo.ready} signedIn={!!user} />}
            <Composer
              key={resetKey}
              repo={repo}
              repoPath={repoPath}
              setRepoPath={setRepoPath}
              token={token}
              setToken={setToken}
              onInvestigate={(input) => {
                const parent =
                  followParent && input.location.startsWith(`${followParent.path}:`)
                    ? { caseId: followParent.caseId, question: followParent.question }
                    : undefined;
                setFollowParent(null);
                return investigate(input, tokenValue, language, parent);
              }}
              signedIn={!!user}
              prefill={prefill}
            />
          </div>

          {busy && <LoadingCard />}

          {draftCase && draft ? (
            <LiveLineInvestigation
              key={draft.key}
              result={draftCase}
              repoPath={draft.form.repoPath}
              pending
              token={tokenValue}
              phase={draft.error ? "failed" : "collecting"}
              failure={
                draft.error ? (
                  <CaseFailure
                    message={draft.error}
                    signedIn={!!user}
                    onRetry={() => retryDraft(tokenValue, language)}
                    onBack={backToCode}
                  />
                ) : undefined
              }
            />
          ) : lineCase && current ? (
            <LiveLineInvestigation
              key={current.mountKey ?? current.caseId}
              result={current.result}
              repoPath={current.form.repoPath}
              pending={current.pending ?? false}
              token={tokenValue}
              onDrill={drill(current)}
              onFollowUp={() => followUp(current)}
            />
          ) : null}

          {!busy && !lineCase && !draftCase && view === "case" && current && (
            <CaseView
              entry={current}
              onBack={backToCode}
              onDrill={drill(current)}
              onOpenParent={selectCase}
            />
          )}

          {(railResult || railMeta) && (
            <div className="mt-5 flex flex-col gap-3.5 xl:hidden">
              <RailContent result={railResult} repoMeta={railMeta} />
            </div>
          )}
        </div>

        {!lineCase && !draftCase && (
          <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] self-start">
            <RightRail result={railResult} repoMeta={railMeta} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
