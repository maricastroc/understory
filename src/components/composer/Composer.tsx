"use client";

import type { InvestigateInput } from "@git-investigator/core/types";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../icons";
import type { CasePaths } from "../investigator/case-paths";
import { repoDisplayName } from "../shell/repo-display-name";
import { CodeContext } from "./CodeContext";
import { CodeViewer } from "./CodeViewer";
import type { ComposerPrefill } from "./composer-prefill";
import { FileStage } from "./FileStage";
import { useHistoryMap } from "./history/use-history-map";
import { useOverview } from "./history/use-overview";
import { InvestigationPath } from "./InvestigationPath";
import { QuestionForm } from "./QuestionForm";
import { RepoStage } from "./RepoStage";
import { RepoStrip } from "./RepoStrip";
import { StageHeading } from "./StageHeading";
import { stageCopy } from "./stage-copy";
import { symbolNoun } from "./symbol-noun";
import type { ComposerStage } from "./types/composer-stage";
import type { PathStep } from "./types/path-step";
import type { RecentRepo } from "./types/recent-repo";
import { useFileSearch } from "./use-file-search";
import { useFileViewer } from "./use-file-viewer";
import { useTyping } from "./use-typing";
import type { Repo } from "./use-repo";

export function Composer({
  repo,
  repoPath,
  setRepoPath,
  token,
  setToken,
  onInvestigate,
  signedIn = false,
  prefill = null,
  cases,
  recent = [],
  demoRepo = null,
  active = true,
  investigating = false,
}: {
  repo: Repo;
  repoPath: string;
  setRepoPath: (s: string) => void;
  token: string;
  setToken: (s: string) => void;
  onInvestigate: (input: InvestigateInput) => void;
  signedIn?: boolean;
  prefill?: ComposerPrefill | null;
  cases: CasePaths;
  recent?: RecentRepo[];
  demoRepo?: string | null;
  active?: boolean;
  investigating?: boolean;
}) {
  const tokenValue = token.trim() || undefined;
  const viewer = useFileViewer(repoPath);
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useFileSearch(repoPath, repo.ready && q.length >= 2, tokenValue);
  const { overview, error: overviewError } = useOverview(
    repoPath,
    repo.ready,
    cases.ordered,
    tokenValue,
  );
  const [pickingRepo, setPickingRepo] = useState(false);
  const typing = useTyping(query);
  const map = useHistoryMap({
    repoPath,
    overview,
    token: tokenValue,
    active: active && repo.ready,
    busy: typing || viewer.loading || investigating,
  });
  const [question, setQuestion] = useState("Why is this line the way it is?");

  const handledPrefill = useRef<number | null>(null);
  useEffect(() => {
    if (!prefill || !repo.ready || handledPrefill.current === prefill.nonce) return;
    handledPrefill.current = prefill.nonce;
    setQuery("");
    void viewer.open(prefill.path, tokenValue, prefill.line);
  }, [prefill, repo.ready, viewer, tokenValue]);

  const stage: ComposerStage =
    !repo.ready || pickingRepo ? "repo" : viewer.file || viewer.loading ? "code" : "file";

  function editRepo(v: string) {
    setRepoPath(v);
    repo.reset();
    setQuery("");
    viewer.reset();
  }

  function openRepo(path = repoPath) {
    setPickingRepo(false);
    void repo.open(path, tokenValue);
  }

  function openFile(path: string) {
    setQuery("");
    search.setQuery("");
    map.mapFile(path);
    void viewer.open(path, tokenValue);
  }

  function editQuery(v: string) {
    setQuery(v);
    search.setQuery(v);
  }

  const { file, selectedStart, selectedEnd, enclosing } = viewer;
  const selection =
    file && selectedStart !== null
      ? { start: selectedStart, end: selectedEnd ?? selectedStart }
      : null;
  const isSymbolSelected =
    !!enclosing &&
    !!selection &&
    selection.start === enclosing.start &&
    selection.end === enclosing.end;
  const canExpand =
    !!enclosing &&
    !!selection &&
    (selection.start !== enclosing.start || selection.end !== enclosing.end);
  const rangeSize = selection ? selection.end - selection.start + 1 : 0;
  const subject =
    isSymbolSelected && enclosing ? symbolNoun(enclosing.kind) : rangeSize > 1 ? "range" : "line";
  const runLabel =
    isSymbolSelected && enclosing?.name
      ? `Investigate ${enclosing.name}`
      : isSymbolSelected
        ? `Investigate this ${subject}`
        : rangeSize > 1
          ? "Investigate these lines"
          : "Investigate this line";

  function run() {
    if (!file || !selection) return;
    const span =
      selection.end !== selection.start
        ? `${selection.start}-${selection.end}`
        : `${selection.start}`;
    onInvestigate({
      repoPath,
      location: `${file.path}:${span}`,
      question: question.trim(),
    });
  }

  const lineValue = selection
    ? rangeSize > 1
      ? `lines ${selection.start}–${selection.end}`
      : `line ${selection.start}`
    : null;
  const steps: PathStep[] = [
    {
      key: "repo",
      label: "repository",
      value:
        repo.ready && stage !== "repo"
          ? repoDisplayName(repo.meta?.name ?? repoPath)
          : repo.connecting
            ? "opening…"
            : null,
      state: stage === "repo" ? "current" : "done",
      onPick: () => setPickingRepo(true),
    },
    {
      key: "file",
      label: "file",
      value: stage === "code" ? (file?.path ?? "opening…") : null,
      state: stage === "file" ? "current" : stage === "code" ? "done" : "next",
      onPick: repo.ready
        ? () => {
            setPickingRepo(false);
            viewer.reset();
          }
        : null,
    },
    {
      key: "line",
      label: "line",
      value: stage === "code" ? lineValue : null,
      state: stage !== "code" ? "next" : selection ? "done" : "current",
      onPick: stage === "code" ? () => viewer.clearSelection() : null,
    },
    {
      key: "question",
      label: "question",
      value: null,
      state: stage === "code" && selection ? "current" : "next",
      onPick: null,
    },
  ];

  const copy = stageCopy({
    stage,
    connecting: repo.connecting,
    fileLoading: viewer.loading,
    lineValue,
    subject,
    symbolName: isSymbolSelected ? (enclosing?.name ?? null) : null,
  });

  return (
    <div className="mx-auto flex w-full max-w-280 flex-col gap-8 font-li-body text-li-ink">
      <div className="flex flex-col gap-3.5">
        <h1 className="li-eyebrow text-li-text-subtle">New investigation</h1>
        <InvestigationPath steps={steps} />
      </div>

      {stage !== "repo" && (
        <RepoStrip repoPath={repoPath} meta={repo.meta} overview={overview} map={map} />
      )}

      <StageHeading title={copy.title} lead={copy.lead} />

      {stage === "repo" && (
        <RepoStage
          repoPath={repoPath}
          onEdit={editRepo}
          onOpen={() => openRepo()}
          connecting={repo.connecting}
          error={repo.error}
          token={token}
          onTokenChange={setToken}
          signedIn={signedIn}
          demoRepo={demoRepo}
          autoFocus={pickingRepo}
          recent={recent}
          onOpenRecent={(path) => {
            editRepo(path);
            openRepo(path);
          }}
          onOpenDemo={() => {
            if (!demoRepo) return;
            editRepo(demoRepo);
            openRepo(demoRepo);
          }}
        />
      )}

      {stage === "file" && (
        <FileStage
          overview={overview}
          overviewError={overviewError}
          caseCounts={cases.counts}
          query={query}
          onQuery={editQuery}
          results={q.length >= 2 ? search.results : []}
          searching={search.searching}
          settled={!typing}
          map={map}
          onOpen={openFile}
        />
      )}

      {stage !== "repo" && (search.error || viewer.error) && (
        <div
          role="alert"
          className="flex items-start gap-2 border-l-2 border-li-ink pl-4 text-[13px]"
        >
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{search.error || viewer.error}</span>
        </div>
      )}

      {stage === "code" && viewer.loading && (
        <p role="status" className="text-[13px] text-li-text-subtle">
          Opening the file…
        </p>
      )}

      {stage === "code" && file && (
        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-8 max-[1280px]:grid-cols-1">
          <CodeViewer
            file={file}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            enclosing={enclosing}
            onSelect={viewer.selectLine}
            focusLine={prefill?.path === file.path ? prefill.line : undefined}
          />
          <CodeContext
            repoPath={repoPath}
            path={file.path}
            lineCount={file.lines.length}
            head={overview?.head ?? null}
            fileState={map.states.get(file.path)}
            prData={overview?.prData ?? "none"}
            selection={selection}
            token={tokenValue}
          >
            {selection && (
              <QuestionForm
                subject={subject}
                runLabel={runLabel}
                question={question}
                setQuestion={setQuestion}
                onRun={run}
                enclosing={enclosing}
                canExpand={canExpand}
                onExpand={viewer.expandToSymbol}
              />
            )}
          </CodeContext>
        </div>
      )}
    </div>
  );
}
