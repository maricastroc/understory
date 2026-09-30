"use client";

import { CodeText } from "../../../line-investigation/specimen/CodeText";
import { describeLine } from "../../../line-investigation/specimen/describe-line";
import type { CodeSegment, LineRange } from "../../../line-investigation/specimen/types";
import { useHorizontalOverflow } from "../../../line-investigation/specimen/use-horizontal-overflow";
import type { RootsVariant } from "./types";

export function RootsCode({
  variant,
  segments,
  datum,
  token,
  left,
}: {
  variant: RootsVariant;
  segments: CodeSegment[][];
  datum: number;
  token: LineRange | null;
  left: number;
}) {
  const [scrollRef, scrolls] = useHorizontalOverflow();
  const first = Math.max(1, datum - variant.context);
  const rows = Array.from({ length: datum - first + 1 }, (_, i) => first + i);

  return (
    <div
      className="absolute font-li-mono text-li-neutral-800"
      style={{
        top: variant.codeTop - 16,
        left,
        right: variant.mode === "narrow" ? 0 : undefined,
      }}
    >
      <p aria-hidden className="h-4 pl-9 text-[10px] leading-4 text-li-text-subtle">
        {first > 1 && `⌃ lines 1–${first - 1}`}
      </p>
      <div
        ref={scrollRef}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? "region" : undefined}
        aria-label={scrolls ? "Code lines, scroll sideways for long lines" : undefined}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus"
      >
        <ol
          aria-label={`Code, lines ${first}–${datum}`}
          className="w-max min-w-full"
          style={{ fontSize: variant.font }}
        >
          {rows.map((n) => {
            const isDatum = n === datum;
            return (
              <li
                key={n}
                className={`relative flex w-max min-w-full items-center ${
                  isDatum ? "bg-li-datum-row font-medium text-li-ink" : ""
                }`}
                style={{ height: variant.row }}
              >
                {isDatum && (
                  <span aria-hidden className="absolute inset-y-0 left-0 w-0.75 bg-li-datum" />
                )}
                <span
                  aria-hidden
                  className={`w-6 shrink-0 text-right text-xs ${isDatum ? "text-li-ink" : "text-li-text-muted"}`}
                >
                  {n}
                </span>
                <span className="sr-only">{describeLine(n, isDatum, undefined)}</span>
                <CodeText
                  segments={segments[n - 1] ?? []}
                  token={isDatum ? token : null}
                  datum={isDatum}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
