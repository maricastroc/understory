"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "../icons";
import { ErrorState } from "../ErrorState";
import { RailContent, RightRail } from "../rail/RightRail";
import { HistoryDrawer } from "../shell/HistoryDrawer";
import { HistorySidebar } from "../shell/HistorySidebar";
import { CaseRow } from "../sidebar/CaseRow";
import { Composer } from "../composer/Composer";
import { useRepo } from "../composer/use-repo";
import { useLanguage } from "../use-language";
import { useAuth } from "./use-auth";
import { CaseView } from "./CaseView";
import { LoadingCard } from "./LoadingCard";
import { Onboarding } from "./Onboarding";
import { useInvestigation } from "./use-investigation";
import { AppHeader } from "../shell/AppHeader";

export function Investigator() {
  const user = useAuth();
  const {
    repoPath,
    setRepoPath,
    loading,
    error,
    items,
    activeId,
    view,
    resetKey,
    current,
    browsing,
    investigate,
    drillInto,
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  } = useInvestigation(user);

  const repo = useRepo();
  const params = useSearchParams();
  const { language } = useLanguage();
  const [caseFilter, setCaseFilter] = useState("");
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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

  function handleNewInvestigation() {
    setRepoPath("");
    setToken("");
    repo.reset();
    newInvestigation();
  }

  const filterQuery = caseFilter.trim().toLowerCase();
  const shownItems = filterQuery
    ? items.filter(
        (it) =>
          it.question.toLowerCase().includes(filterQuery) ||
          it.caseId.toLowerCase().includes(filterQuery),
      )
    : items;

  const railResult = view === "case" && !loading ? (current?.result ?? null) : null;
  const railMeta = browsing && repo.ready ? repo.meta : null;

  const activeCaseId = view === "case" ? activeId : null;
  const emptyTitle = filterQuery ? "No matches" : "No investigations yet";
  const emptyBody = filterQuery
    ? "Nothing matches your search. Try a different term."
    : "Open a repo, click a line, and run one — each case files itself here.";
  const renderCases = (onSelect: (id: string) => void) =>
    shownItems.map((it) => (
      <CaseRow
        key={it.caseId}
        item={it}
        active={it.caseId === activeCaseId}
        onSelect={onSelect}
        onRemove={removeCase}
      />
    ));

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        mode="line"
        repoPath={repoPath}
        filter={caseFilter}
        onFilterChange={setCaseFilter}
        onMenuClick={() => setMenuOpen(true)}
        user={user}
      />

      <div className="flex min-h-0 flex-1">
        <HistorySidebar
          ariaLabel="Investigations"
          label="Investigations"
          count={shownItems.length}
          onNew={handleNewInvestigation}
          newLabel="New investigation"
          emptyIcon={<Search className="size-4.5" />}
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          user={user}
        >
          {renderCases(selectCase)}
        </HistorySidebar>

        <HistoryDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          ariaLabel="Investigations"
          label="Investigations"
          count={shownItems.length}
          onNew={() => {
            handleNewInvestigation();
            setMenuOpen(false);
          }}
          newLabel="New investigation"
          emptyIcon={<Search className="size-4.5" />}
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          user={user}
        >
          {renderCases((id) => {
            selectCase(id);
            setMenuOpen(false);
          })}
        </HistoryDrawer>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-270 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {error && browsing && (
              <div className="mb-4">
                <ErrorState message={error} signedIn={!!user} />
              </div>
            )}

            <div className={browsing ? "" : "hidden"}>
              {items.length === 0 && <Onboarding repoReady={repo.ready} signedIn={!!user} />}
              <Composer
                key={resetKey}
                repo={repo}
                repoPath={repoPath}
                setRepoPath={setRepoPath}
                token={token}
                setToken={setToken}
                onInvestigate={(input) => investigate(input, token.trim() || undefined, language)}
                signedIn={!!user}
              />
            </div>

            {loading && <LoadingCard />}

            {!loading && view === "case" && current && (
              <CaseView
                entry={current}
                onBack={backToCode}
                onDrill={(anchor) =>
                  drillInto(
                    current.caseId,
                    current.form.question || "Why is this line the way it is?",
                    anchor,
                    current.form.repoPath,
                    token.trim() || undefined,
                    language,
                  )
                }
                onOpenParent={selectCase}
              />
            )}

            {(railResult || railMeta) && (
              <div className="mt-5 flex flex-col gap-3.5 xl:hidden">
                <RailContent result={railResult} repoMeta={railMeta} />
              </div>
            )}
          </div>
        </main>

        <RightRail result={railResult} repoMeta={railMeta} />
      </div>
    </div>
  );
}
