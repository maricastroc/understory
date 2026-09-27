import type { SymbolSpan } from "@git-investigator/core/collect/symbol";
import { useEffect, useMemo } from "react";
import { Braces, FileIcon, Pencil } from "../icons";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { liButton } from "../line-investigation/parts/button-class";
import { CodeText } from "../line-investigation/specimen/CodeText";
import { highlightLines } from "../line-investigation/specimen/highlight-code";
import { PANEL } from "./composer-classes";
import { GoToLine } from "./GoToLine";
import type { OpenFile } from "./use-file-viewer";
import { useVirtualRows } from "./use-virtual-rows";

const NOUN: Record<string, string> = {
  method: "function",
  module: "module",
  namespace: "namespace",
};
const symbolNoun = (kind: string): string => NOUN[kind] ?? kind;

const ROW_H = 20;

export function CodeViewer({
  file,
  selectedStart,
  selectedEnd,
  enclosing,
  onSelect,
  onExpand,
  question,
  setQuestion,
  noCapture,
  setNoCapture,
  onRun,
  focusLine,
}: {
  file: OpenFile;
  selectedStart: number | null;
  selectedEnd: number | null;
  enclosing: SymbolSpan | null;
  onSelect: (n: number, extend: boolean) => void;
  onExpand: () => void;
  question: string;
  setQuestion: (v: string) => void;
  noCapture: boolean;
  setNoCapture: (v: boolean) => void;
  onRun: () => void;
  focusLine?: number;
}) {
  const { scrollRef, startIndex, endIndex, totalHeight, onScroll, scrollToIndex } = useVirtualRows(
    file.lines.length,
    ROW_H,
  );
  useEffect(() => {
    if (focusLine) scrollToIndex(focusLine - 1);
  }, [focusLine, scrollToIndex]);
  const segments = useMemo(() => highlightLines(file.lines, file.path), [file.lines, file.path]);

  const goToLine = (n: number) => {
    onSelect(n, false);
    scrollToIndex(n - 1);
  };

  const hasSelection = selectedStart !== null && selectedEnd !== null;
  const rangeSize = hasSelection ? selectedEnd - selectedStart + 1 : 0;
  const locLabel = hasSelection
    ? `${file.path}:${selectedStart}${rangeSize > 1 ? `-${selectedEnd}` : ""}`
    : file.path;

  const isSymbolSelected =
    !!enclosing && selectedStart === enclosing.start && selectedEnd === enclosing.end;
  const canExpand =
    !!enclosing && (selectedStart !== enclosing.start || selectedEnd !== enclosing.end);

  const subject = isSymbolSelected ? symbolNoun(enclosing.kind) : rangeSize > 1 ? "lines" : "line";
  const runLabel =
    isSymbolSelected && enclosing.name
      ? `Investigate ${enclosing.name}`
      : isSymbolSelected
        ? `Investigate this ${subject}`
        : rangeSize > 1
          ? "Investigate these lines"
          : "Investigate this line";

  return (
    <div className={`overflow-hidden ${PANEL}`}>
      <div className="flex items-center gap-2 border-b border-li-divider bg-li-paper px-3.5 py-2">
        <FileIcon className="size-3.5 text-li-text-muted" />
        <span className="font-li-mono text-xs text-li-ink">{file.path}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-li-text-subtle">
          {file.lines.length} lines · click a line ·
          <kbd className="border border-li-divider bg-li-neutral-100 px-1 font-li-mono text-[10px] leading-[1.4] text-li-ink">
            ⇧
          </kbd>
          shift-click for a range
        </span>
        <GoToLine max={file.lines.length} onGo={goToLine} />
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="max-h-110 overflow-auto">
        <ol className="relative select-none" style={{ height: totalHeight }}>
          {file.lines.slice(startIndex, endIndex).map((ln, k) => {
            const n = startIndex + k + 1;
            const inRange = hasSelection && n >= selectedStart && n <= selectedEnd;
            const isEnd = n === selectedEnd;
            return (
              <li
                key={n}
                className="absolute left-0"
                style={{
                  top: (n - 1) * ROW_H,
                  height: ROW_H,
                  minWidth: "100%",
                  width: "max-content",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => onSelect(n, e.shiftKey)}
                  aria-pressed={inRange}
                  aria-label={`Line ${n}${inRange ? ", selected" : ""}. Shift-click or shift-enter to extend the range.`}
                  className={`group flex h-full w-full cursor-pointer items-center border-l-[3px] text-left font-li-mono text-xs leading-[1.6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel ${
                    inRange
                      ? "border-li-datum bg-li-datum-row font-medium text-li-ink"
                      : "border-transparent text-li-neutral-800 hover:bg-li-neutral-200"
                  }`}
                >
                  <span
                    className={`w-14 shrink-0 pr-3 text-right ${
                      inRange ? "font-semibold text-li-ink" : "text-li-text-muted"
                    }`}
                  >
                    {n}
                  </span>
                  <span className="flex-1">
                    {ln ? (
                      <CodeText segments={segments[n - 1] ?? []} token={null} datum={inRange} />
                    ) : (
                      " "
                    )}
                  </span>
                  {inRange && isEnd && (
                    <span className="shrink-0 self-center pr-3 font-li-body text-[10.5px] font-semibold text-li-datum-ink">
                      {isSymbolSelected
                        ? symbolNoun(enclosing.kind)
                        : rangeSize > 1
                          ? `${rangeSize} lines`
                          : "selected"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {hasSelection && (
        <div className="flex flex-col gap-3 border-t border-li-divider bg-li-paper p-4">
          {canExpand && (
            <button
              type="button"
              onClick={onExpand}
              className={liButton("secondary", "w-fit px-2.5 py-1.5 text-xs")}
            >
              <Braces className="size-3.5" />
              Expand to the whole{" "}
              {enclosing.name ? (
                <>
                  <code className="font-li-mono font-semibold">{enclosing.name}</code>{" "}
                </>
              ) : null}
              {symbolNoun(enclosing.kind)}
              <span className="text-li-text-subtle">
                {" · "}
                {enclosing.end - enclosing.start + 1} lines
              </span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor="investigate-question"
              className="text-[13.5px] font-semibold text-li-ink"
            >
              What do you want to know about this {subject}?
            </label>
            <span className="ml-auto inline-flex items-center gap-1.5 font-li-mono text-[11.5px] text-li-text-subtle">
              <FileIcon className="size-3.5 text-li-text-muted" />
              {locLabel}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Pencil className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-li-text-muted" />
              <input
                id="investigate-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onRun()}
                placeholder={`Ask about this ${subject}…`}
                className="h-11 w-full border border-li-divider bg-li-neutral-100 pr-3 pl-9 text-sm text-li-ink placeholder:text-li-text-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-li-steel"
              />
            </div>
            <button type="button" onClick={onRun} className={liButton("primary", "h-11 px-5")}>
              <BlueprintCorners />
              {runLabel}
            </button>
          </div>
          <p className="text-[11.5px] text-li-text-subtle">
            Edit the question before investigating — it steers how the history is reconstructed.
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-li-text-subtle">
              Questions are logged anonymously (the repo and file location, never your identity) to
              improve investigations.
            </p>
            <label className="flex w-fit cursor-pointer items-center gap-1.5 text-[11px] text-li-text-subtle">
              <input
                type="checkbox"
                aria-label="Don't log this question"
                checked={noCapture}
                onChange={(e) => setNoCapture(e.target.checked)}
                className="size-3.5 cursor-pointer accent-li-steel-700"
              />
              Don&apos;t log this question
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
