"use client";

import { enclosingSymbol } from "@git-investigator/core/collect/symbol";
import type { BlameSpan } from "@git-investigator/core/types";
import { useEffect, useId, useMemo } from "react";
import { blameBars } from "./blame-bars";
import { codeWindow } from "./code-window";
import { symbolInRange } from "./collapsed-label";
import { datumToken } from "./datum-token";
import { describeLine } from "./describe-line";
import { highlightLines } from "./highlight-code";
import { RangeToggle } from "./RangeToggle";
import { rangeLabel } from "./range-label";
import { SpecimenHeader } from "./SpecimenHeader";
import { SpecimenLine } from "./SpecimenLine";
import { SPECIMEN } from "./specimen-metrics";
import type { BlameStatus, LineRange, SpecimenLayout, SpecimenWidth } from "./types";

const WIDTH: Record<SpecimenWidth, string> = { wide: "w-115", narrow: "w-105", full: "w-full" };

export function CodeSpecimen({
  path,
  lines,
  datum,
  question,
  blame,
  blameStatus,
  now,
  layout,
  expanded,
  onToggleExpanded,
  targetDatumY,
  onDatumY,
}: {
  path: string;
  lines: string[];
  datum: LineRange;
  question: string;
  blame: BlameSpan[] | null;
  blameStatus: BlameStatus;
  now: number;
  layout: SpecimenLayout;
  expanded: boolean;
  onToggleExpanded: () => void;
  targetDatumY?: number;
  onDatumY?: (y: number) => void;
}) {
  const listId = useId();
  const enclosing = useMemo(
    () => enclosingSymbol(lines, datum.end, path),
    [lines, datum.end, path],
  );
  const segments = useMemo(() => highlightLines(lines, path), [lines, path]);

  const input = {
    lineCount: lines.length,
    datum,
    enclosing,
    mode: layout.mode,
    context: layout.context,
    targetDatumY,
  };
  const win = codeWindow({ ...input, expanded });
  const collapsed = expanded ? codeWindow({ ...input, expanded: false }) : win;
  const canCollapse = !!(collapsed.hiddenBefore || collapsed.hiddenAfter);

  const usable = blameStatus === "ready" || blameStatus === "loading" ? blame : null;
  const bars = blameBars(usable, lines, { start: win.start, end: win.end }, datum, now);
  const token =
    datum.start === datum.end ? datumToken(question, lines[datum.start - 1] ?? "") : null;

  useEffect(() => {
    onDatumY?.(win.datumY);
  }, [win.datumY, onDatumY]);

  const hiddenLabel = (range: LineRange) => rangeLabel(range, symbolInRange(lines, range, path));
  const footerLabel =
    layout.mode === "strip"
      ? expanded
        ? "Show less"
        : "Show file"
      : expanded
        ? "Show less"
        : win.hiddenAfter
          ? hiddenLabel(win.hiddenAfter)
          : null;
  const showFooter =
    footerLabel !== null && (expanded ? canCollapse : !!(win.hiddenAfter || win.hiddenBefore));

  const rows: number[] = [];
  for (let n = win.start; n <= win.end; n++) rows.push(n);

  return (
    <section
      aria-label={`Code, ${path}`}
      data-datum-y={win.datumY}
      data-mode={layout.mode}
      className={`flex flex-col border border-li-divider bg-li-neutral-100 font-li-mono text-xs text-li-neutral-800 shadow-li-sm ${WIDTH[layout.width]}`}
    >
      <SpecimenHeader path={path} status={blameStatus} hasBars={bars.size > 0} />
      <div className="overflow-x-auto pt-2.5 pb-2">
        {win.padRows > 0 && (
          <div aria-hidden style={{ height: win.padRows * SPECIMEN.rowHeight }} />
        )}
        {win.beforeRow && win.hiddenBefore && (
          <RangeToggle
            label={hiddenLabel(win.hiddenBefore)}
            expanded={false}
            controls={listId}
            placement="top"
            onToggle={onToggleExpanded}
          />
        )}
        <ol id={listId} className="w-max min-w-full">
          {rows.map((n) => {
            const isDatum = n >= datum.start && n <= datum.end;
            const bar = bars.get(n);
            return (
              <SpecimenLine
                key={n}
                line={n}
                segments={segments[n - 1] ?? []}
                datum={isDatum}
                token={isDatum ? token : null}
                bar={bar}
                description={describeLine(n, isDatum, bar)}
              />
            );
          })}
        </ol>
      </div>
      {showFooter && footerLabel && (
        <RangeToggle
          label={footerLabel}
          expanded={expanded}
          controls={listId}
          placement="bottom"
          onToggle={onToggleExpanded}
        />
      )}
    </section>
  );
}
