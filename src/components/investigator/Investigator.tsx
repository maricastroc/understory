"use client";

import { useEffect, useState } from "react";
import { Alert } from "../icons";
import { RightRail } from "../RightRail";
import { Sidebar } from "../Sidebar";
import { Composer } from "../composer/Composer";
import { useRepo } from "../composer/use-repo";
import { CaseView } from "./CaseView";
import { Header } from "./Header";
import { LoadingCard } from "./LoadingCard";
import { useInvestigation } from "./use-investigation";

export function Investigator() {
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
    selectCase,
    backToCode,
    newInvestigation,
    removeCase,
  } = useInvestigation();

  const repo = useRepo();
  const [caseFilter, setCaseFilter] = useState("");
  const [token, setToken] = useState("");
  const user = null;

  useEffect(() => {
    void repo.open(repoPath);
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

  return (
    <div className="flex h-screen flex-col">
      <Header
        repoPath={repoPath}
        filter={caseFilter}
        onFilterChange={setCaseFilter}
        onNewInvestigation={handleNewInvestigation}
        user={user}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          items={shownItems}
          activeId={view === "case" ? activeId : null}
          onSelect={selectCase}
          onRemove={removeCase}
          filtering={filterQuery.length > 0}
          user={user}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-270 px-8 py-6">
            {error && browsing && (
              <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-crit/25 bg-crit-tint p-4 text-[13px] text-crit">
                <Alert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className={browsing ? "" : "hidden"}>
              <Composer
                key={resetKey}
                repo={repo}
                repoPath={repoPath}
                setRepoPath={setRepoPath}
                token={token}
                setToken={setToken}
                onInvestigate={(input) => investigate(input, token.trim() || undefined)}
              />
            </div>

            {loading && <LoadingCard />}

            {!loading && view === "case" && current && (
              <CaseView entry={current} onBack={backToCode} />
            )}
          </div>
        </main>

        <RightRail
          result={view === "case" && !loading ? (current?.result ?? null) : null}
          repoMeta={browsing && repo.ready ? repo.meta : null}
        />
      </div>
    </div>
  );
}
