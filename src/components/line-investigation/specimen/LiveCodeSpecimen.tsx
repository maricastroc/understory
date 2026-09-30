"use client";

import { enclosingSymbol } from "@understory/core/collect/symbol";
import { useMemo } from "react";
import { blameRequestRange } from "./blame-request-range";
import { CodeSpecimen } from "./CodeSpecimen";
import { codeWindow } from "./code-window";
import type { LineRange, SpecimenLayout } from "./types";
import { useSpecimenSource } from "./use-specimen-source";
import { useWindowBlame } from "./use-window-blame";

export function LiveCodeSpecimen({
  repo,
  path,
  sha,
  datum,
  question,
  now,
  expanded,
  onToggleExpanded,
  layout,
  targetDatumY,
  onDatumY,
  token,
  awaitingSha = false,
}: {
  repo: string;
  path: string;
  sha: string | null;
  datum: LineRange;
  question: string;
  now: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  layout: SpecimenLayout;
  targetDatumY?: number;
  onDatumY?: (y: number) => void;
  token?: string;
  awaitingSha?: boolean;
}) {
  const source = useSpecimenSource(repo, path, sha, token);
  const lines = source.lines;

  const request = useMemo(() => {
    if (!lines) return null;
    const win = codeWindow({
      lineCount: lines.length,
      datum,
      enclosing: enclosingSymbol(lines, datum.end, path),
      mode: layout.mode,
      context: layout.context,
      targetDatumY,
      expanded,
    });
    return blameRequestRange({ start: win.start, end: win.end }, datum);
  }, [lines, datum, path, layout.mode, layout.context, targetDatumY, expanded]);

  const blame = useWindowBlame(repo, path, sha, request, token);

  if (source.status !== "ready") {
    return (
      <section
        aria-label={`Code, ${path}`}
        aria-busy={source.status === "loading"}
        className="flex h-36 flex-col border border-li-divider bg-li-neutral-100 font-li-mono text-xs shadow-li-sm"
      >
        <div className="flex h-9 items-center border-b border-li-divider px-3.5 font-medium text-li-ink">
          {path.split("/").pop()}
        </div>
        <p
          role={source.status === "error" ? "alert" : undefined}
          className="p-3.5 text-li-text-muted"
        >
          {source.status === "error"
            ? `Could not load this file: ${source.error}`
            : "Loading file…"}
        </p>
      </section>
    );
  }

  return (
    <CodeSpecimen
      path={path}
      lines={source.lines}
      datum={datum}
      question={question}
      blame={blame.spans}
      blameStatus={awaitingSha && !sha ? "loading" : blame.status}
      now={now}
      layout={layout}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      targetDatumY={targetDatumY}
      onDatumY={onDatumY}
    />
  );
}
