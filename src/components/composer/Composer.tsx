"use client";

import { useState } from "react";
import type { InvestigateInput } from "@git-investigator/core/types";
import { Alert } from "../icons";
import { CodeViewer } from "./CodeViewer";
import { FileFinder } from "./FileFinder";
import { RepoBar } from "./RepoBar";
import { RepoOverview } from "./RepoOverview";
import { useFileSearch } from "./use-file-search";
import { useFileViewer } from "./use-file-viewer";
import type { Repo } from "./use-repo";

export function Composer({
  repo,
  repoPath,
  setRepoPath,
  token,
  setToken,
  onInvestigate,
}: {
  repo: Repo;
  repoPath: string;
  setRepoPath: (s: string) => void;
  token: string;
  setToken: (s: string) => void;
  onInvestigate: (input: InvestigateInput) => void;
}) {
  const viewer = useFileViewer(repoPath);
  const search = useFileSearch(repoPath, repo.ready, viewer.file?.path, token.trim() || undefined);
  const [question, setQuestion] = useState("Why is this line the way it is?");
  const [noCapture, setNoCapture] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("gi:no-capture") === "1",
  );
  function updateNoCapture(v: boolean) {
    setNoCapture(v);
    localStorage.setItem("gi:no-capture", v ? "1" : "0");
  }

  function editRepo(v: string) {
    setRepoPath(v);
    repo.reset();
    search.clear();
    viewer.reset();
  }

  function openFile(path: string) {
    search.clear();
    search.setQuery(path);
    void viewer.open(path, token.trim() || undefined);
  }

  function editFind(v: string) {
    search.setQuery(v);
    if (v.trim() === "" && viewer.file) viewer.reset();
  }

  function run() {
    const { file, selectedStart, selectedEnd } = viewer;
    if (!file || selectedStart === null) return;
    const span =
      selectedEnd !== null && selectedEnd !== selectedStart
        ? `${selectedStart}-${selectedEnd}`
        : `${selectedStart}`;
    onInvestigate({
      repoPath,
      location: `${file.path}:${span}`,
      question: question.trim(),
      noCapture,
    });
  }

  const q = search.query.trim();
  const showEmpty =
    repo.ready &&
    q.length >= 2 &&
    !search.searching &&
    search.results.length === 0 &&
    viewer.file?.path !== q;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-panel">
        <div className="border-b border-line px-3.5 py-3">
          <h1 className="text-[15px] font-semibold tracking-tight">Start an investigation</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            Paste a GitHub repo (or a local path), find a file by name or symbol, then click the
            line you&apos;re curious about.
          </p>
        </div>
        <RepoBar
          repoPath={repoPath}
          onEdit={editRepo}
          onOpen={() => repo.open(repoPath, token.trim() || undefined)}
          connecting={repo.connecting}
          ready={repo.ready}
          meta={repo.meta}
          error={repo.error}
          token={token}
          onTokenChange={setToken}
        />
        <FileFinder
          query={search.query}
          setQuery={editFind}
          results={search.results}
          searching={search.searching}
          enabled={repo.ready}
          showEmpty={showEmpty}
          onOpenFile={openFile}
        />
      </div>

      {repo.ready && repo.meta && !viewer.file && !viewer.loading && (
        <RepoOverview meta={repo.meta} />
      )}

      {(search.error || viewer.error) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[10px] border border-crit/25 bg-crit-tint p-3 text-[12.5px] text-crit"
        >
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{search.error || viewer.error}</span>
        </div>
      )}

      {viewer.loading && (
        <div className="rounded-[10px] border border-line bg-surface p-5 text-[13px] text-ink-3">
          Opening file…
        </div>
      )}

      {viewer.file && (
        <CodeViewer
          file={viewer.file}
          selectedStart={viewer.selectedStart}
          selectedEnd={viewer.selectedEnd}
          enclosing={viewer.enclosing}
          onSelect={viewer.selectLine}
          onExpand={viewer.expandToSymbol}
          question={question}
          setQuestion={setQuestion}
          noCapture={noCapture}
          setNoCapture={updateNoCapture}
          onRun={run}
        />
      )}
    </div>
  );
}
