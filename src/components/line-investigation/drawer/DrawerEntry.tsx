import { anchorQuestion } from "@git-investigator/core/anchor-question";
import { depthText, displayId, kindName, labelTitle } from "../copy/artifact-copy";
import { artifactStatus, citesText, contextLines, metaLine } from "../copy/drawer-copy";
import {
  gapBasis,
  gapBody,
  gapId,
  gapKind,
  gapLetter,
  gapStatus,
  gapTitle,
} from "../copy/gap-copy";
import type { EvidenceEntry } from "../copy/types";
import type { ViewArtifact, ViewClause } from "../model/types";
import { BlueprintCorners } from "../parts/BlueprintCorners";
import { EvidenceLetter } from "../parts/EvidenceLetter";
import { liButton } from "../parts/button-class";
import { withoutTitle } from "./drawer-body";
import { MiniCore } from "./MiniCore";
import { QuoteBlock } from "./QuoteBlock";
import { sourceLinkLabel } from "./source-link";
import type { DrawerExtensions } from "./types";

const TONE = {
  evidence: "text-li-evidence-ink",
  neutral: "text-li-text-subtle",
  gap: "text-li-gap-ink",
} as const;

export function DrawerEntry({
  entry,
  artifacts,
  clauses,
  maxDays,
  headingId,
  headingRef,
  onStep,
  onClose,
  onDrill,
  extensions = {},
}: {
  entry: EvidenceEntry;
  artifacts: ViewArtifact[];
  clauses: ViewClause[];
  maxDays: number;
  headingId: string;
  headingRef: (el: HTMLHeadingElement | null) => void;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
  onDrill?: (a: ViewArtifact) => void;
  extensions?: DrawerExtensions;
}) {
  const links = extensions.appearsIn?.(entry) ?? null;
  const a = entry.type === "artifact" ? entry.artifact : entry.after;
  const fraction = maxDays > 0 && a.daysBeforeNow !== null ? a.daysBeforeNow / maxDays : 0;
  const gap = entry.type === "gap" ? entry.gap : null;
  const status = gap
    ? { text: gapStatus(gap), tone: gap.verified ? ("gap" as const) : ("neutral" as const) }
    : artifactStatus(a, clauses);
  const context = gap ? [gapBasis(gap)] : contextLines(a, artifacts);
  const quotes = gap ? [] : a.quotes;

  return (
    <>
      <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-li-divider px-4 py-3.5">
        <MiniCore fraction={gap ? Math.min(1, fraction + 0.08) : fraction} />
        <div className="flex min-w-0 flex-col gap-0.75">
          <div className="flex items-center gap-2 font-li-mono text-[10.5px] text-li-text-subtle">
            <EvidenceLetter
              letter={gap ? gapLetter(gap) : a.letter}
              variant={
                gap
                  ? gap.verified
                    ? "gap"
                    : "unverified"
                  : a.role === "cited"
                    ? "cited"
                    : "supporting"
              }
            />
            <span className="tracking-[0.05em]">
              {gap ? gapKind(gap) : kindName(a.kind).toUpperCase()}
            </span>
            <span>{depthText(a.daysBeforeNow)}</span>
          </div>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="font-li-mono text-[13px] font-medium break-all text-li-ink focus:outline-none"
          >
            {gap ? gapId(gap, a) : displayId(a)}
          </h2>
          <div className="text-xs text-li-text-subtle">
            {gap ? gapTitle(gap) : metaLine(a, artifacts)}
          </div>
        </div>
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label="Previous artifact"
            onClick={() => onStep(-1)}
            className={liButton("icon")}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Next artifact"
            onClick={() => onStep(1)}
            className={liButton("icon")}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Close evidence"
            onClick={onClose}
            className={liButton("icon")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-auto p-4">
        <div className="text-[17px] leading-[1.3] font-semibold text-li-ink">
          {gap ? gapTitle(gap) : labelTitle(a)}
        </div>
        {gap ? (
          <QuoteBlock
            body={gapBody(gap, a)}
            range={null}
            tone={gap.verified ? "gap" : "unverified"}
          />
        ) : quotes.length > 0 ? (
          quotes.map((q, i) => {
            const shown = withoutTitle(a.source.body, a.title, q.range);
            const clause = clauses.find((c) => c.id === q.clauseId);
            return (
              <QuoteBlock
                key={`${q.clauseId}-${i}`}
                body={shown.body}
                range={shown.range}
                tone="verified"
                caption={
                  extensions.quoteCaption
                    ? extensions.quoteCaption(q.clauseId)
                    : clause
                      ? `for clause ${clause.index + 1}`
                      : undefined
                }
              />
            );
          })
        ) : (
          <QuoteBlock
            body={withoutTitle(a.source.body, a.title, null).body}
            range={null}
            tone="unverified"
          />
        )}
        <div className="flex flex-col gap-1.5 text-[12.5px]">
          <div className={`font-semibold ${TONE[status.tone]}`}>{status.text}</div>
          {!gap && !links && <div className="text-li-neutral-800">{citesText(a, clauses)}</div>}
        </div>
        {links && links.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-li-divider pt-3">
            <div className="text-xs font-semibold text-li-ink">Appears in</div>
            <div className="flex flex-wrap gap-1.5">
              {links.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  onClick={link.onPick}
                  className="cursor-pointer rounded-[3px] border border-li-divider px-2 py-0.5 font-li-mono text-[11px] text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {context.length > 0 && (
          <div className="flex flex-col gap-1.25 border-t border-li-divider pt-3 text-[12.5px] text-li-neutral-800">
            <div className="text-xs font-semibold text-li-ink">Context</div>
            <ul className="flex flex-col gap-1.25">
              {context.map((line) => (
                <li key={line} className="flex gap-1.5">
                  <span aria-hidden className="text-li-text-muted">
                    —
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!gap && (onDrill || a.source.url) && (
        <div className="flex flex-col gap-2.5 border-t border-li-divider px-4 py-3.5">
          {onDrill && (
            <p className="text-[12.5px] leading-[1.45] text-li-text-subtle">
              Investigate opens a new case anchored here and asks{" "}
              <span className="text-li-ink">“{anchorQuestion[a.kind]}”</span>
            </p>
          )}
          <div className="flex gap-2">
            {onDrill && (
              <button type="button" onClick={() => onDrill(a)} className={liButton("primary")}>
                <BlueprintCorners />
                Investigate →
              </button>
            )}
            {a.source.url && (
              <a
                href={a.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={liButton("ghost")}
              >
                {sourceLinkLabel(a.source.url)} ↗
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
