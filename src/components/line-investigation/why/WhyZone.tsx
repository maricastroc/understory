import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { AnalysisLanguage, CasePhase } from "../case/types";
import { clauseDescription } from "../copy/clause-copy";
import type { InvestigationView, ViewArtifact, ViewClause } from "../model/types";
import { LANGUAGE_NAME, LanguageSwitch } from "../parts/LanguageSwitch";
import { ClauseRow } from "./ClauseRow";

const HOVER_DELAY = 120;
const LEAVE_DELAY = 160;

function showsClauses(view: InvestigationView, phase: CasePhase | undefined): boolean {
  if (phase || view.clauses.length === 0) return false;
  return !(view.empty && (view.verdict === "not-recorded" || view.verdict === "evidence-only"));
}

function hintFor(view: InvestigationView, pinnedIndex: number | null, clauses: boolean): string {
  if (pinnedIndex !== null) return `checking clause ${pinnedIndex + 1} · Esc returns here`;
  if (!clauses) return "";
  return "select a clause to check its evidence";
}

export function WhyZone({
  view,
  byId,
  effective,
  pinned,
  marked,
  onHover,
  onPick,
  compact,
  phase,
  failure,
  analysis,
  renderEvidence,
}: {
  view: InvestigationView;
  byId: Map<string, ViewArtifact>;
  effective: string | null;
  pinned: string | null;
  marked: Set<string>;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  compact: boolean;
  phase?: CasePhase;
  failure?: ReactNode;
  analysis?: AnalysisLanguage;
  renderEvidence?: (clause: ViewClause, id: string) => ReactNode;
}) {
  const headingId = useId();
  const evidenceId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [focusIndex, setFocusIndex] = useState(0);
  const intent = useRef<number | undefined>(undefined);
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(fn, ms);
  };
  useEffect(() => () => window.clearTimeout(intent.current), []);
  const pinnedIndex = view.clauses.findIndex((c) => c.id === pinned);
  const clauses = showsClauses(view, phase);

  const move = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(
      view.clauses.length - 1,
      Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)),
    );
    setFocusIndex(next);
    buttons.current.get(view.clauses[next].id)?.focus();
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex min-h-7 flex-wrap items-center gap-x-2.5 gap-y-1 pl-7">
        <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
          Reconstructed why
        </h2>
        <span aria-live="polite" className="text-xs text-li-text-subtle">
          {analysis?.rewriting
            ? `rewriting in ${LANGUAGE_NAME[analysis.selected]}…`
            : hintFor(view, pinnedIndex >= 0 ? pinnedIndex : null, clauses)}
        </span>
        {analysis && (
          <div className="ml-auto">
            <LanguageSwitch
              label="Analysis"
              language={analysis.selected}
              onChange={analysis.onSelect}
            />
          </div>
        )}
      </div>
      <WhyBody view={view} phase={phase} failure={failure} />
      {clauses && (
        <ol lang={view.language ?? undefined} className="relative mt-1 flex flex-col gap-1">
          {view.clauses.map((clause, i) => (
            <ClauseRow
              key={clause.id}
              clause={clause}
              description={clauseDescription(clause, byId)}
              expanded={effective === clause.id}
              pinned={pinned === clause.id}
              marked={!effective && marked.has(clause.id)}
              quiet={effective !== null && effective !== clause.id}
              compact={compact}
              tabIndex={i === focusIndex ? 0 : -1}
              onPointerIn={() => later(() => onHover(clause.id), HOVER_DELAY)}
              onPointerOut={() => later(() => onHover(null), LEAVE_DELAY)}
              onFocusIn={() => {
                window.clearTimeout(intent.current);
                onHover(clause.id);
              }}
              onFocusOut={() => later(() => onHover(null), 0)}
              onPick={() => {
                setFocusIndex(i);
                onPick(clause.id);
              }}
              onKeyDown={(e) => move(e, i)}
              buttonRef={(el) => {
                if (el) buttons.current.set(clause.id, el);
                else buttons.current.delete(clause.id);
              }}
              controls={`${evidenceId}-${clause.id}`}
              evidence={
                pinned === clause.id && renderEvidence
                  ? renderEvidence(clause, `${evidenceId}-${clause.id}`)
                  : null
              }
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function Skeleton({ caption }: { caption: string }) {
  return (
    <div role="status" className="mt-1 flex flex-col gap-1.5 pl-7">
      <span className="text-xs text-li-text-subtle">{caption}</span>
      {[0.9, 0.7, 0.8, 0.55].map((w) => (
        <span key={w} className="flex h-12.5 items-start pt-2">
          <span className="h-3 bg-li-neutral-200" style={{ width: `${w * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

function WhyBody({
  view,
  phase,
  failure,
}: {
  view: InvestigationView;
  phase?: CasePhase;
  failure?: ReactNode;
}) {
  if (phase === "collecting") return <Skeleton caption="Collecting the line's history…" />;
  if (phase === "failed") return <div className="mt-1 flex flex-col gap-2.5 pl-7">{failure}</div>;
  if (view.empty && view.verdict !== "out-of-scope" && view.verdict !== "fabrication") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p className="text-base text-li-ink">No history was found for this line.</p>
        <p className="text-xs text-li-text-subtle">
          {view.pinnedSha
            ? `The investigation read ${view.pinnedSha.slice(0, 7)} and found no commit that changed it, so there is nothing to trace.`
            : "The investigation found no commit that changed it, so there is nothing to trace."}
        </p>
      </div>
    );
  }
  if (view.verdict === "pending") {
    const n = view.artifacts.length;
    return <Skeleton caption={`Reconstructing from ${n} artifact${n === 1 ? "" : "s"}…`} />;
  }
  if (view.verdict === "evidence-only") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p className="text-base text-li-text-subtle">
          No reconstruction. The evidence below is complete.
        </p>
        {view.error && <p className="text-xs text-li-text-subtle">{view.error}</p>}
      </div>
    );
  }
  if (view.verdict === "out-of-scope") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p lang={view.language ?? undefined} className="text-base text-li-ink">
          {view.answer}
        </p>
        <p className="text-xs text-li-text-subtle">
          The question is outside what this line&apos;s history can answer. The evidence is still
          shown below.
        </p>
      </div>
    );
  }
  return null;
}
