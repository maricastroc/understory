"use client";

import { useEffect, useState } from "react";
import type { InvestigateInput } from "@/lib/types";
import { Alert } from "../icons";
import { CodeViewer } from "./CodeViewer";
import { FileFinder } from "./FileFinder";
import { RepoBar } from "./RepoBar";
import { useFileSearch } from "./use-file-search";
import { useFileViewer } from "./use-file-viewer";
import { useRepo } from "./use-repo";

export function Composer({
  repoPath,
  setRepoPath,
  onInvestigate,
}: {
  repoPath: string;
  setRepoPath: (s: string) => void;
  onInvestigate: (input: InvestigateInput) => void;
}) {
  const repo = useRepo();
  const viewer = useFileViewer(repoPath);
  const search = useFileSearch(repoPath, repo.ready, viewer.file?.path);
  const [question, setQuestion] = useState("Why is this line the way it is?");

  useEffect(() => {
    void repo.open(repoPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editRepo(v: string) {
    setRepoPath(v);
    repo.reset();
    search.clear();
    viewer.reset();
  }

  function openFile(path: string) {
    search.clear();
    search.setQuery(path);
    void viewer.open(path);
  }

  function run() {
    if (!viewer.file || !viewer.selectedLine) return;
    onInvestigate({
      repoPath,
      location: `${viewer.file.path}:${viewer.selectedLine}`,
      question: question.trim(),
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
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">Start an investigation</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">
          Paste a GitHub repo (or a local path), find a file by name or symbol, then click the line
          you&apos;re curious about.
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
        <RepoBar
          repoPath={repoPath}
          onEdit={editRepo}
          onOpen={() => repo.open(repoPath)}
          connecting={repo.connecting}
          ready={repo.ready}
          meta={repo.meta}
          error={repo.error}
        />
        <FileFinder
          query={search.query}
          setQuery={search.setQuery}
          results={search.results}
          searching={search.searching}
          enabled={repo.ready}
          showEmpty={showEmpty}
          onOpenFile={openFile}
        />
      </div>

      {(search.error || viewer.error) && (
        <div className="flex items-start gap-2 rounded-[10px] border border-crit/25 bg-crit-tint p-3 text-[12.5px] text-crit">
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
          selectedLine={viewer.selectedLine}
          onSelect={viewer.setSelectedLine}
          question={question}
          setQuestion={setQuestion}
          onRun={run}
        />
      )}
    </div>
  );
}
