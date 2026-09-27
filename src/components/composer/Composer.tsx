"use client";

import type { InvestigateInput } from "@git-investigator/core/types";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../icons";
import type { CasePaths } from "../investigator/case-paths";
import { repoDisplayName } from "../shell/repo-display-name";
import { CodeViewer } from "./CodeViewer";
import { PANEL } from "./composer-classes";
import type { ComposerPrefill } from "./composer-prefill";
import { ComposerTitle } from "./ComposerTitle";
import { FileStage } from "./FileStage";
import { useHistoryMap } from "./history/use-history-map";
import { useOverview } from "./history/use-overview";
import { RepoStage } from "./RepoStage";
import type { ComposerStage } from "./types/composer-stage";
import type { TrailSlot } from "./types/trail-slot";
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
  demoRepo?: string | null;
  active?: boolean;
  investigating?: boolean;
}) {
  const tokenValue = token.trim() || undefined;
  const viewer = useFileViewer(repoPath);
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useFileSearch(repoPath, repo.ready && q.length >= 2, undefined, tokenValue);
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
  const [noCapture, setNoCapture] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("gi:no-capture") === "1",
  );
  function updateNoCapture(v: boolean) {
    setNoCapture(v);
    localStorage.setItem("gi:no-capture", v ? "1" : "0");
  }

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

  const selected = viewer.file && viewer.selectedStart !== null;
  const lineText = !selected
    ? "line"
    : viewer.selectedEnd !== null && viewer.selectedEnd !== viewer.selectedStart
      ? `lines ${viewer.selectedStart}–${viewer.selectedEnd}`
      : `line ${viewer.selectedStart}`;
  const slots: TrailSlot[] = [
    {
      key: "repo",
      text: repo.ready ? repoDisplayName(repo.meta?.name ?? repoPath) : "repository",
      filled: repo.ready && stage !== "repo",
      current: stage === "repo",
      enabled: true,
      dot: true,
      onPick: () => setPickingRepo(true),
    },
    {
      key: "file",
      text: viewer.file?.path ?? "file",
      filled: !!viewer.file && stage === "code",
      current: stage === "file",
      enabled: repo.ready,
      onPick: () => {
        setPickingRepo(false);
        viewer.reset();
      },
    },
    {
      key: "line",
      text: lineText,
      filled: !!selected && stage === "code",
      current: stage === "code" && !selected,
      enabled: stage === "code",
      tone: "datum",
      onPick: () => setPickingRepo(false),
    },
    {
      key: "question",
      text: selected && question.trim() ? question.trim() : "question",
      filled: !!selected && stage === "code" && !!question.trim(),
      current: false,
      enabled: !!selected && stage === "code",
      onPick: () => setPickingRepo(false),
    },
  ];

  return (
    <div className="flex flex-col gap-5.5 font-li-body text-li-ink">
      <ComposerTitle slots={slots} />

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
          onOpenDemo={() => {
            if (!demoRepo) return;
            editRepo(demoRepo);
            openRepo(demoRepo);
          }}
        />
      )}

      {stage === "file" && (
        <FileStage
          meta={repo.meta}
          overview={overview}
          overviewError={overviewError}
          caseCounts={cases.counts}
          query={query}
          onQuery={editQuery}
          results={q.length >= 2 ? search.results : []}
          searching={search.searching}
          map={map}
          onOpen={openFile}
        />
      )}

      {stage !== "repo" && (search.error || viewer.error) && (
        <div role="alert" className={`flex items-start gap-2 p-3 text-[12.5px] ${PANEL}`}>
          <Alert className="mt-0.5 size-4 shrink-0" />
          <span>{search.error || viewer.error}</span>
        </div>
      )}

      {stage === "code" && viewer.loading && (
        <div role="status" className={`max-w-270 p-5 text-[13px] text-li-text-subtle ${PANEL}`}>
          Opening file…
        </div>
      )}

      {stage === "code" && viewer.file && (
        <div className="max-w-270">
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
            focusLine={prefill?.path === viewer.file.path ? prefill.line : undefined}
          />
        </div>
      )}
    </div>
  );
}
