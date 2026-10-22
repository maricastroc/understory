import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import type { AnalysisLanguage, CasePhase } from "../case/types";
import { clauseDescription } from "../copy/clause-copy";
import { writerError } from "../copy/verdict-copy";
import { sourceNamer } from "../copy/why-copy";
import type { InvestigationView, ViewArtifact, ViewClause } from "../model/types";
import { LanguageSwitch } from "../parts/LanguageSwitch";
import { ClauseRow } from "./ClauseRow";
import { ReadingWhy } from "./ReadingWhy";
import { whyModel } from "./why-model";

const HOVER_DELAY = 120;
const LEAVE_DELAY = 160;

function showsClauses(view: InvestigationView, phase: CasePhase | undefined): boolean {
  if (phase || view.clauses.length === 0) return false;
  return !(view.empty && (view.verdict === "not-recorded" || view.verdict === "evidence-only"));
}

function hintFor(
  pinnedIndex: number | null,
  clauses: boolean,
  noun: "clause" | "sentence",
  m: Messages,
): string {
  if (pinnedIndex !== null) return m.why.checking(pinnedIndex + 1);
  if (!clauses) return "";
  return noun === "sentence" ? m.why.selectSentence : m.why.selectClause;
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
  const m = useMessages();
  const locale = useLocale();
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
  const body = whyBody(view, m, locale, phase, failure);
  const plain = body === null;
  const model = useMemo(
    () => (view.reading && plain ? whyModel(view.reading) : null),
    [view.reading, plain],
  );
  const source = useMemo(() => sourceNamer(view.artifacts), [view.artifacts]);
  const clauses = model
    ? model.changes.some((c) => c.entries.length > 0) || model.unsustained.length > 0
    : showsClauses(view, phase);

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
          {view.reading ? m.why.title : m.why.reconstructed}
        </h2>
        <span aria-live="polite" className="text-xs text-li-text-subtle">
          {analysis?.rewriting
            ? m.languages.rewriting(m.languages.name[analysis.selected])
            : hintFor(
                pinnedIndex >= 0 ? pinnedIndex : null,
                clauses,
                model ? "sentence" : "clause",
                m,
              )}
        </span>
        {analysis && (
          <div className="ml-auto">
            <LanguageSwitch
              label={m.languages.analysis}
              language={analysis.selected}
              onChange={analysis.onSelect}
            />
          </div>
        )}
      </div>
      {body}
      {model && (
        <ReadingWhy
          model={model}
          language={view.language}
          clauses={view.clauses}
          source={source}
          effective={effective}
          pinned={pinned}
          onHover={onHover}
          onPick={onPick}
          evidenceId={evidenceId}
          renderEvidence={renderEvidence}
        />
      )}
      {!model && clauses && (
        <ol className="relative mt-1 flex flex-col gap-1">
          {view.clauses.map((clause, i) => (
            <ClauseRow
              key={clause.id}
              clause={clause}
              description={clauseDescription(clause, byId, locale)}
              lang={view.language ?? undefined}
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

function whyBody(
  view: InvestigationView,
  m: Messages,
  locale: Locale,
  phase?: CasePhase,
  failure?: ReactNode,
): ReactNode {
  if (phase === "collecting") return <Skeleton caption={m.why.collecting} />;
  if (phase === "failed") return <div className="mt-1 flex flex-col gap-2.5 pl-7">{failure}</div>;
  if (view.empty && view.verdict !== "out-of-scope" && view.verdict !== "fabrication") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p className="text-base text-li-ink">{m.why.noHistory}</p>
        <p className="text-xs text-li-text-subtle">
          {view.pinnedSha ? m.why.noCommitAt(view.pinnedSha.slice(0, 7)) : m.why.noCommit}
        </p>
      </div>
    );
  }
  if (view.verdict === "pending") {
    return <Skeleton caption={m.why.reconstructing(view.artifacts.length)} />;
  }
  if (view.verdict === "evidence-only") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p className="text-base text-li-text-subtle">{m.why.noReconstruction}</p>
        {view.error && (
          <p
            lang={writerError(view.error, locale) === view.error ? "en" : undefined}
            className="text-xs text-li-text-subtle"
          >
            {writerError(view.error, locale)}
          </p>
        )}
      </div>
    );
  }
  if (view.verdict === "out-of-scope") {
    return (
      <div className="mt-1 flex flex-col gap-1.5 pl-7">
        <p lang={view.language ?? undefined} className="text-base text-li-ink">
          {view.answer}
        </p>
        <p className="text-xs text-li-text-subtle">{m.why.outOfScope}</p>
      </div>
    );
  }
  return null;
}
