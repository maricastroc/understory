import type { SymbolSpan } from "@understory/core/collect/symbol";
import { useEffect, useMemo, useRef } from "react";
import { CodeText } from "../line-investigation/specimen/CodeText";
import { highlightLines } from "../line-investigation/specimen/highlight-code";
import { GoToLine } from "./GoToLine";
import { symbolNoun } from "./symbol-noun";
import type { OpenFile } from "./use-file-viewer";
import { useVirtualRows } from "./use-virtual-rows";

const ROW_H = 20;

export function CodeViewer({
  file,
  selectedStart,
  selectedEnd,
  enclosing,
  onSelect,
  focusLine,
}: {
  file: OpenFile;
  selectedStart: number | null;
  selectedEnd: number | null;
  enclosing: SymbolSpan | null;
  onSelect: (n: number, extend: boolean) => void;
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
  const dragging = useRef(false);
  const pointerPicked = useRef(false);
  useEffect(() => {
    const stop = () => {
      dragging.current = false;
      setTimeout(() => {
        pointerPicked.current = false;
      }, 0);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const goToLine = (n: number) => {
    onSelect(n, false);
    scrollToIndex(n - 1);
  };

  const hasSelection = selectedStart !== null && selectedEnd !== null;
  const rangeSize = hasSelection ? selectedEnd - selectedStart + 1 : 0;
  const isSymbolSelected =
    !!enclosing && selectedStart === enclosing.start && selectedEnd === enclosing.end;
  const slash = file.path.lastIndexOf("/");

  return (
    <section
      aria-label={`Code, ${file.path}`}
      className="flex min-w-0 flex-col border border-li-divider bg-li-neutral-100"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-li-divider px-3.5 py-2">
        <span className="min-w-0 truncate font-li-mono text-xs text-li-ink">
          <span className="text-li-text-subtle">{file.path.slice(0, slash + 1)}</span>
          {file.path.slice(slash + 1)}
        </span>
        <span className="font-li-mono text-[11px] text-li-text-subtle">
          {file.lines.length} lines
        </span>
        <span className="ml-auto text-[11.5px] text-li-neutral-800 max-[640px]:hidden">
          Drag or shift-click to select a range
        </span>
        <GoToLine max={file.lines.length} onGo={goToLine} />
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[min(70vh,760px)] min-h-72 overflow-auto max-[1280px]:max-h-[58vh]"
      >
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
                  onPointerDown={(e) => {
                    if (e.pointerType !== "mouse" || e.button !== 0) return;
                    pointerPicked.current = true;
                    dragging.current = true;
                    onSelect(n, e.shiftKey);
                  }}
                  onPointerEnter={(e) => {
                    if (dragging.current && e.buttons === 1) onSelect(n, true);
                  }}
                  onClick={(e) => {
                    if (!pointerPicked.current) onSelect(n, e.shiftKey);
                  }}
                  aria-pressed={inRange}
                  aria-label={`Line ${n}${inRange ? ", selected" : ""}. Shift-click, shift-enter or drag to extend the range.`}
                  className={`group flex h-full w-full cursor-pointer items-center border-l-[3px] text-left font-li-mono text-xs leading-[1.6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus ${
                    inRange
                      ? "border-li-datum bg-li-datum-row font-medium text-li-ink"
                      : "border-transparent text-li-neutral-800 hover:border-li-datum-weak hover:bg-li-neutral-200/50"
                  }`}
                >
                  <span
                    className={`w-14 shrink-0 pr-3 text-right ${
                      inRange
                        ? "font-medium text-li-ink"
                        : "text-li-text-muted group-hover:text-li-ink"
                    }`}
                  >
                    {n}
                  </span>
                  <span className="flex-1 pr-4">
                    {ln ? (
                      <CodeText segments={segments[n - 1] ?? []} token={null} datum={inRange} />
                    ) : (
                      " "
                    )}
                  </span>
                  {inRange && isEnd && (
                    <span className="shrink-0 self-center pr-3 font-li-mono text-[10.5px] font-medium text-li-datum-ink">
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
    </section>
  );
}
