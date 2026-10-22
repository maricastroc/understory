"use client";

import type { HeadCommit } from "@understory/core/types";
import { useMemo } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
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
  const locale = useLocale();
  const c = useMessages().composer.context;
  if (state?.status === "mapped" && state.history && head) {
    const view = coreHistory(state.history, head, depthScale([state.history], head));
    return (
      <>
        <p className="text-[14px] leading-snug text-li-ink">{historyFacts(view, locale)}</p>
        <p className="font-li-mono text-[11px] text-li-text-subtle">
          {prData === "none" ? c.prUnavailable : historyShares(view, locale)}
        </p>
      </>
    );
  }
  const text =
    state?.status === "mapping"
      ? c.mapping
      : state?.status === "unavailable"
        ? c.historyUnavailable
        : state?.status === "too-large"
          ? c.tooLarge
          : c.notMapped;
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
  const locale = useLocale();
  const m = useMessages();
  const c = m.composer.context;
  const blame = useWindowBlame(repoPath, path, head?.sha ?? null, range, token);
  const change = blame.spans ? lastChange(blame.spans, head, locale) : null;
  const lineLabel = selection ? m.composer.lines(selection.start, selection.end) : null;

  return (
    <aside aria-label={c.label} className="flex flex-col gap-5">
      <ContextBlock label={c.file} icon="file">
        <p className="font-li-mono text-[13px] text-li-ink">{c.linesAtHead(lineCount)}</p>
        <FileHistory state={fileState} head={head} prData={prData} />
      </ContextBlock>
      {lineLabel && (
        <ContextBlock label={lineLabel} icon="line">
          {change ? (
            <>
              <p className="flex flex-wrap items-center gap-x-1.5 text-[14px] leading-snug text-li-ink">
                <DomainIcon kind="commit" size={14} />
                {change.commits > 1 ? c.commitsChanged(change.commits) : c.lastChangedBy}{" "}
                <span className="font-li-mono text-li-ink">{change.sha}</span>
                {change.author && <> · {change.author}</>}
              </p>
              <p className="font-li-mono text-[11px] text-li-text-subtle">
                {change.date}
                {change.age && ` · ${m.map.beforeHead(change.age)}`}
              </p>
            </>
          ) : blame.status === "loading" ? (
            <p className="text-[13px] text-li-text-subtle">{c.readingLastChange}</p>
          ) : (
            <p className="text-[13px] text-li-text-subtle">{c.lastChangeUnavailable}</p>
          )}
          <p className="flex items-center gap-1.5 text-[12.5px] text-li-neutral-800">
            <span aria-hidden className="flex gap-1 opacity-50">
              <DomainIcon kind="pull_request" size={13} />
              <DomainIcon kind="issue" size={13} />
            </span>
            {c.notDug}
          </p>
        </ContextBlock>
      )}
      {children}
    </aside>
  );
}
