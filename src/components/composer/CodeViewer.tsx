import { FileIcon, Pencil } from "../icons";
import type { OpenFile } from "./use-file-viewer";

export function CodeViewer({
  file,
  selectedStart,
  selectedEnd,
  onSelect,
  question,
  setQuestion,
  onRun,
}: {
  file: OpenFile;
  selectedStart: number | null;
  selectedEnd: number | null;
  onSelect: (n: number, extend: boolean) => void;
  question: string;
  setQuestion: (v: string) => void;
  onRun: () => void;
}) {
  const hasSelection = selectedStart !== null && selectedEnd !== null;
  const rangeSize = hasSelection ? selectedEnd - selectedStart + 1 : 0;
  const locLabel = hasSelection
    ? `${file.path}:${selectedStart}${rangeSize > 1 ? `-${selectedEnd}` : ""}`
    : file.path;

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
              <li
                key={n}
                onClick={(e) => onSelect(n, e.shiftKey)}
                className={`group flex cursor-pointer border-l-[3px] font-mono text-[12.5px] leading-[1.6] ${
                  inRange
                    ? "border-accent bg-accent-tint"
                    : "border-transparent hover:bg-inset"
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
                    {rangeSize > 1 ? `${rangeSize} lines` : "selected"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {hasSelection && (
        <div className="flex flex-col gap-3 border-t-2 border-accent/25 bg-accent-tint/25 p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor="investigate-question"
              className="text-[13.5px] font-semibold tracking-tight text-ink"
            >
              What do you want to know about this line?
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
                placeholder="Ask about this line…"
                className="h-11 w-full rounded-md border border-line-2 bg-surface pr-3 pl-9 text-[14px] text-ink shadow-sm transition-[border-color,box-shadow] outline-none placeholder:text-ink-3 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <button
              type="button"
              onClick={onRun}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent px-5 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-press"
            >
              {rangeSize > 1 ? "Investigate these lines" : "Investigate this line"}
            </button>
          </div>
          <p className="text-[11.5px] text-ink-2">
            Edit the question before investigating — it steers how the history is reconstructed.
          </p>
        </div>
      )}
    </div>
  );
}
