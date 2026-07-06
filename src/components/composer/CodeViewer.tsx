import type { SymbolSpan } from "@/lib/collect/symbol";
import { Braces, FileIcon, Pencil } from "../icons";
import type { OpenFile } from "./use-file-viewer";

const NOUN: Record<string, string> = {
  method: "function",
  module: "module",
  namespace: "namespace",
};
const symbolNoun = (kind: string): string => NOUN[kind] ?? kind;

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
}) {
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
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2">
        <FileIcon className="size-3.5 text-ink-3" />
        <span className="font-mono text-[12.5px] text-ink">{file.path}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-2">
          {file.lines.length} lines · click a line ·
          <kbd className="rounded border border-line-2 bg-surface px-1 font-mono text-[10px] leading-[1.4] text-ink-2">
            ⇧
          </kbd>
          shift-click for a range
        </span>
      </div>

      <div className="max-h-110 overflow-auto">
        <ol className="py-1 select-none">
          {file.lines.map((ln, i) => {
            const n = i + 1;
            const inRange = hasSelection && n >= selectedStart && n <= selectedEnd;
            const isEnd = n === selectedEnd;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={(e) => onSelect(n, e.shiftKey)}
                  aria-pressed={inRange}
                  aria-label={`Line ${n}${inRange ? ", selected" : ""}. Shift-click or shift-enter to extend the range.`}
                  className={`group flex w-full cursor-pointer border-l-[3px] text-left font-mono text-[12.5px] leading-[1.6] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-inset focus-visible:outline-none ${
                    inRange ? "border-accent bg-accent-tint" : "border-transparent hover:bg-inset"
                  }`}
                >
                  <span
                    className={`w-12 shrink-0 border-r pr-3 text-right ${
                      inRange
                        ? "border-accent/40 font-semibold text-accent-press"
                        : "border-transparent text-ink-3"
                    }`}
                  >
                    {n}
                  </span>
                  <code className="flex-1 px-3 whitespace-pre text-ink">{ln || " "}</code>
                  {inRange && isEnd && (
                    <span className="shrink-0 self-center pr-3 text-[10.5px] font-semibold text-accent-press">
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
        <div className="flex flex-col gap-3 border-t-2 border-accent/25 bg-accent-tint/25 p-4">
          {canExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-accent/30 bg-surface px-2.5 py-1.5 text-[12px] text-accent-press shadow-sm transition-colors hover:bg-accent-tint"
            >
              <Braces className="size-3.5" />
              Expand to the whole
              {enclosing.name ? (
                <code className="font-mono font-semibold">{enclosing.name}</code>
              ) : null}
              {symbolNoun(enclosing.kind)}
              <span className="text-ink-3">· {enclosing.end - enclosing.start + 1} lines</span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor="investigate-question"
              className="text-[13.5px] font-semibold tracking-tight text-ink"
            >
              What do you want to know about this {subject}?
            </label>
            <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11.5px] text-ink-2">
              <FileIcon className="size-3.5 text-ink-3" />
              {locLabel}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Pencil className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <input
                id="investigate-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onRun()}
                placeholder={`Ask about this ${subject}…`}
                className="h-11 w-full rounded-md border border-line-2 bg-surface pr-3 pl-9 text-[14px] text-ink shadow-sm transition-[border-color,box-shadow] outline-none placeholder:text-ink-3 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <button
              type="button"
              onClick={onRun}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent px-5 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-press"
            >
              {runLabel}
            </button>
          </div>
          <p className="text-[11.5px] text-ink-2">
            Edit the question before investigating — it steers how the history is reconstructed.
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-ink-3">
              Questions are logged anonymously (the repo and file location, never your identity) to
              improve investigations.
            </p>
            <label className="flex w-fit cursor-pointer items-center gap-1.5 text-[11px] text-ink-3">
              <input
                type="checkbox"
                checked={noCapture}
                onChange={(e) => setNoCapture(e.target.checked)}
                className="size-3.5 cursor-pointer accent-accent"
              />
              Don&apos;t log this question
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
