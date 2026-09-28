import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CasePhase } from "../case/types";
import { clauseDescription } from "../copy/clause-copy";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { ClauseRow } from "./ClauseRow";

const RING_OFFSET = 14;

function showsClauses(view: InvestigationView, phase: CasePhase | undefined): boolean {
  if (phase || view.clauses.length === 0) return false;
  return !(view.empty && (view.verdict === "not-recorded" || view.verdict === "evidence-only"));
}

function hintFor(view: InvestigationView, pinnedIndex: number | null, clauses: boolean): string {
  if (pinnedIndex !== null) return `tracing clause ${pinnedIndex + 1} · other evidence dimmed`;
  if (!clauses) return "";
  return "hover a clause to see its evidence";
}

export function WhyZone({
  view,
  byId,
  effective,
  pinned,
  marked,
  onHover,
  onPick,
  onClear,
  onRings,
  compact,
  demo = false,
  phase,
  failure,
}: {
  view: InvestigationView;
  byId: Map<string, ViewArtifact>;
  effective: string | null;
  pinned: string | null;
  marked: Set<string>;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  onClear: () => void;
  onRings: (rings: Map<string, number>) => void;
  compact: boolean;
  demo?: boolean;
  phase?: CasePhase;
  failure?: ReactNode;
}) {
  const headingId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [focusIndex, setFocusIndex] = useState(0);
  const pinnedIndex = view.clauses.findIndex((c) => c.id === pinned);
  const clauses = showsClauses(view, phase);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const rings = new Map<string, number>();
      for (const li of list.querySelectorAll<HTMLLIElement>("li[data-clause]")) {
        rings.set(li.dataset.clause!, list.offsetTop + li.offsetTop + RING_OFFSET);
      }
      onRings(rings);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [view.clauses, onRings]);

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
      <div className="flex h-7 items-center gap-2.5 pl-7">
        <h2 id={headingId} className="text-[13px] font-semibold text-li-ink">
          Reconstructed why
        </h2>
        <span className="text-xs text-li-text-subtle">
          {demo
            ? "hover a clause to trace its evidence"
            : hintFor(view, pinnedIndex >= 0 ? pinnedIndex : null, clauses)}
        </span>
        {pinned && !demo && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto cursor-pointer rounded-[3px] border border-li-divider px-2 py-0.5 text-[11.5px] text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
          >
            Clear · Esc
          </button>
        )}
      </div>
      <WhyBody view={view} phase={phase} failure={failure} />
      {clauses && (
        <ol ref={listRef} className="relative mt-1 flex flex-col gap-1.5">
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
              dense={demo && !compact}
              tabIndex={i === focusIndex ? 0 : -1}
              onEnter={() => onHover(clause.id)}
              onLeave={() => onHover(null)}
              onPick={() => {
                setFocusIndex(i);
                onPick(clause.id);
              }}
              onKeyDown={(e) => move(e, i)}
              buttonRef={(el) => {
                if (el) buttons.current.set(clause.id, el);
                else buttons.current.delete(clause.id);
              }}
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
        <p className="text-base text-li-ink">{view.answer}</p>
        <p className="text-xs text-li-text-subtle">
          The question is outside what this line&apos;s history can answer. The evidence is still
          shown below.
        </p>
      </div>
    );
  }
  return null;
}
