"use client";

import { useEffect, useState } from "react";
import { Alert } from "../icons";
import { RailContent, RightRail } from "../rail/RightRail";
import { MobileSidebar } from "../sidebar/MobileSidebar";
import { Sidebar } from "../sidebar/Sidebar";
import { Composer } from "../composer/Composer";
import { useRepo } from "../composer/use-repo";
import { useAuth } from "./use-auth";
import { CaseView } from "./CaseView";
import { Header } from "./Header";
import { LoadingCard } from "./LoadingCard";
import { useInvestigation } from "./use-investigation";

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
  const [caseFilter, setCaseFilter] = useState("");
  const [token, setToken] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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

  const railResult = view === "case" && !loading ? (current?.result ?? null) : null;
  const railMeta = browsing && repo.ready ? repo.meta : null;

  return (
    <div className="flex h-screen flex-col">
      <Header
        repoPath={repoPath}
        filter={caseFilter}
        onFilterChange={setCaseFilter}
        onNewInvestigation={handleNewInvestigation}
        onMenuClick={() => setMenuOpen(true)}
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

        <MobileSidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={shownItems}
          activeId={view === "case" ? activeId : null}
          onSelect={(id) => {
            selectCase(id);
            setMenuOpen(false);
          }}
          onRemove={removeCase}
          filtering={filterQuery.length > 0}
          user={user}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-270 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
