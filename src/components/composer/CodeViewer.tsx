import { FileIcon } from "../icons";
import type { OpenFile } from "./use-file-viewer";

const field =
  "h-9 rounded-md border border-line bg-inset px-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:bg-surface";

export function CodeViewer({
  file,
  selectedLine,
  onSelect,
  question,
  setQuestion,
  onRun,
}: {
  file: OpenFile;
  selectedLine: number | null;
  onSelect: (n: number) => void;
  question: string;
  setQuestion: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3.5 py-2">
        <FileIcon className="size-3.5 text-ink-3" />
        <span className="font-mono text-[12.5px] text-ink">{file.path}</span>
        <span className="ml-auto text-[11px] text-ink-3">
          {file.lines.length} lines · click a line to investigate it
        </span>
      </div>

      <div className="max-h-[440px] overflow-auto">
        <ol className="py-1">
          {file.lines.map((ln, i) => {
            const n = i + 1;
            const sel = selectedLine === n;
            return (
              <li
                key={n}
                onClick={() => onSelect(n)}
                className={`group flex cursor-pointer font-mono text-[12.5px] leading-[1.6] ${
                  sel ? "bg-accent-tint" : "hover:bg-inset"
                }`}
              >
                <span
                  className={`w-12 shrink-0 border-r pr-3 text-right select-none ${
                    sel ? "border-accent/40 text-accent-press" : "border-transparent text-ink-3"
                  }`}
                >
                  {n}
                </span>
                <code className="flex-1 px-3 whitespace-pre text-ink">{ln || " "}</code>
                {sel && (
                  <span className="shrink-0 self-center pr-3 text-[10.5px] font-semibold text-accent-press">
                    selected
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {selectedLine && (
        <div className="flex flex-col gap-2 border-t border-line bg-surface-2 p-3 sm:flex-row sm:items-center">
          <span className="shrink-0 font-mono text-[12px] text-ink-2">
            {file.path}:{selectedLine}
          </span>
          <input
            aria-label="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onRun()}
            placeholder="Why is this line the way it is?"
            className={`${field} flex-1`}
          />
          <button
            type="button"
            onClick={onRun}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-press"
          >
            Investigate this line
          </button>
        </div>
      )}
    </div>
  );
}
