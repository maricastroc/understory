"use client";

import type { HeadCommit } from "@git-investigator/core/types";
import { useMemo } from "react";
import { useWindowBlame } from "../line-investigation/specimen/use-window-blame";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { ContextBlock } from "./ContextBlock";
import { coreHistory, depthScale } from "./history/depth";
import { historyFacts, historyShares } from "./history/share-copy";
import type { CoreState } from "./history/types";
import { lastChange } from "./line-context-copy";

const MAX_WINDOW = 400;

function FileHistory({
  state,
  head,
  prData,
}: {
  state: CoreState | undefined;
  head: HeadCommit | null;
  prData: "github" | "none";
}) {
  if (state?.status === "mapped" && state.history && head) {
    const view = coreHistory(state.history, head, depthScale([state.history], head));
    return (
      <>
        <p className="text-[14px] leading-snug text-li-ink">{historyFacts(view)}</p>
        <p className="font-li-mono text-[11px] text-li-text-subtle">
          {prData === "none" ? "PR data unavailable for this repo" : historyShares(view)}
        </p>
      </>
    );
  }
  const text =
    state?.status === "mapping"
      ? "Mapping the history of its current lines…"
      : state?.status === "unavailable"
        ? "The history of its current lines is unavailable."
        : state?.status === "too-large"
          ? "Too large to map its history."
          : "The history of its current lines is not mapped yet.";
  return <p className="text-[13px] text-li-text-subtle">{text}</p>;
}

export function CodeContext({
  repoPath,
  path,
  lineCount,
  head,
  fileState,
  prData,
  selection,
  token,
  children,
}: {
  repoPath: string;
  path: string;
  lineCount: number;
  head: HeadCommit | null;
  fileState: CoreState | undefined;
  prData: "github" | "none";
  selection: { start: number; end: number } | null;
  token?: string;
  children?: React.ReactNode;
}) {
  const range = useMemo(
    () =>
      selection
        ? { start: selection.start, end: Math.min(selection.end, selection.start + MAX_WINDOW - 1) }
        : null,
    [selection],
  );
  const blame = useWindowBlame(repoPath, path, head?.sha ?? null, range, token);
  const change = blame.spans ? lastChange(blame.spans, head) : null;
  const lineLabel = selection
    ? selection.start === selection.end
      ? `line ${selection.start}`
      : `lines ${selection.start}–${selection.end}`
    : null;

  return (
    <aside aria-label="Context" className="flex flex-col gap-5">
      <ContextBlock label="file" icon="file">
        <p className="font-li-mono text-[13px] text-li-ink">{lineCount} lines at HEAD</p>
        <FileHistory state={fileState} head={head} prData={prData} />
      </ContextBlock>
      {lineLabel && (
        <ContextBlock label={lineLabel} icon="line">
          {change ? (
            <>
              <p className="flex flex-wrap items-center gap-x-1.5 text-[14px] leading-snug text-li-ink">
                <DomainIcon kind="commit" size={14} />
                {change.commits > 1
                  ? `${change.commits} commits last changed these lines. Newest: `
                  : "Last changed by "}
                <span className="font-li-mono text-li-ink">{change.sha}</span>
                {change.author && <> · {change.author}</>}
              </p>
              <p className="font-li-mono text-[11px] text-li-text-subtle">
                {change.date}
                {change.age && ` · ${change.age} before HEAD`}
              </p>
            </>
          ) : blame.status === "loading" ? (
            <p className="text-[13px] text-li-text-subtle">Reading its last change…</p>
          ) : (
            <p className="text-[13px] text-li-text-subtle">Its last change is unavailable here.</p>
          )}
          <p className="flex items-center gap-1.5 text-[12.5px] text-li-neutral-800">
            <span aria-hidden className="flex gap-1 opacity-50">
              <DomainIcon kind="pull_request" size={13} />
              <DomainIcon kind="issue" size={13} />
            </span>
            Not dug yet: the pull request, reviews and issues behind it.
          </p>
        </ContextBlock>
      )}
      {children}
    </aside>
  );
}
