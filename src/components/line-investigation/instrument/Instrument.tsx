"use client";

import { type Dispatch, type ReactNode, useCallback, useMemo, useState } from "react";
import { arrivalDelays } from "../bore/arrival-delays";
import { markCenter, boreMarks } from "../bore/bore-marks";
import { BoreGraphics } from "../bore/BoreGraphics";
import { BoreLabels } from "../bore/BoreLabels";
import type { CasePhase } from "../case/types";
import { tracePath } from "../bore/trace-path";
import { boreInput } from "../layout/bore-input";
import { computeBoreLayout } from "../layout/compute-bore-layout";
import { BORE } from "../layout/geometry";
import type { InvestigationView, ViewGap } from "../model/types";
import { SPECIMEN } from "../specimen/specimen-metrics";
import type { SpecimenLayout } from "../specimen/types";
import { effectiveClause } from "../state/case-reducer";
import type { CaseAction, CaseState } from "../state/types";
import { WhyZone } from "../why/WhyZone";
import { instrumentGeometry } from "./instrument-geometry";
import type { SpecimenSlot } from "./types";
import { useElementHeight } from "./use-element-height";

const STRIP_GAP = 16;
const WHY_TO_DATUM = 16;

export function Instrument({
  view,
  state,
  dispatch,
  layout,
  now,
  renderSpecimen,
  phase,
  failure,
  arrive = false,
}: {
  view: InvestigationView;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
  layout: SpecimenLayout;
  now: number;
  renderSpecimen: SpecimenSlot;
  phase?: CasePhase;
  failure?: ReactNode;
  arrive?: boolean;
}) {
  const geometry = instrumentGeometry(layout);
  const [whyRef, whyHeight] = useElementHeight();
  const [specimenRef, specimenHeight] = useElementHeight();
  const [specimenDatum, setSpecimenDatum] = useState<number | null>(null);
  const [rings, setRings] = useState<Map<string, number>>(new Map());
  const [userExpanded, setUserExpanded] = useState<Set<string>>(new Set());

  const effective = effectiveClause(state);
  const clause = view.clauses.find((c) => c.id === effective) ?? null;
  const active = useMemo(() => (clause ? new Set(clause.citations) : null), [clause]);
  const byId = useMemo(() => new Map(view.artifacts.map((a) => [a.id, a])), [view.artifacts]);
  const gaps = useMemo(
    () => new Map<string, ViewGap>(view.gaps.map((g) => [g.id, g])),
    [view.gaps],
  );
  const input = useMemo(() => boreInput(view), [view]);

  const panel = geometry.mode === "panel";
  const specimenTop = panel ? 0 : whyHeight + STRIP_GAP;
  const targetDatumY = panel
    ? Math.max(SPECIMEN.defaultDatumY, whyHeight + WHY_TO_DATUM)
    : SPECIMEN.defaultDatumY;
  const datumY = specimenDatum === null ? null : specimenTop + specimenDatum;
  const boreTop =
    datumY === null ? null : panel ? datumY : specimenTop + specimenHeight + STRIP_GAP;

  const bore = useMemo(() => {
    if (boreTop === null) return null;
    const collapsed = computeBoreLayout(input.items, input.gaps, {
      now,
      datumY: boreTop,
      expandedGroups: userExpanded,
    });
    const forced = new Set(userExpanded);
    for (const g of collapsed.glyphs) {
      if (g.members.length > 1 && active && g.members.some((m) => active.has(m))) forced.add(g.id);
    }
    return forced.size === userExpanded.size
      ? collapsed
      : computeBoreLayout(input.items, input.gaps, {
          now,
          datumY: boreTop,
          expandedGroups: forced,
        });
  }, [input, now, boreTop, userExpanded, active]);

  const drawn = bore && (bore.glyphs.length > 0 || bore.gaps.length > 0) ? bore : null;
  const marks = drawn ? boreMarks(drawn, byId, active) : [];
  const arrival = useMemo(() => (arrive && drawn ? arrivalDelays(drawn) : null), [arrive, drawn]);
  const trace = (() => {
    if (!clause || clause.silent || boreTop === null) return null;
    const startY = panel ? rings.get(clause.id) : boreTop;
    if (startY === undefined) return null;
    const targets = clause.citations
      .map((id) => marks.find((m) => m.members.includes(id)))
      .filter((m) => !!m)
      .map((m) => markCenter(m));
    return tracePath({
      laneX: BORE.coreX - 18,
      branchX: BORE.coreX - 8,
      startY,
      ringX: null,
      targets: [...new Set(targets)],
      silent: false,
      pinned: state.pinnedClause === clause.id,
    });
  })();

  const marked = new Set<string>();
  if (state.hoverArtifact) {
    for (const c of view.clauses) if (c.citations.includes(state.hoverArtifact)) marked.add(c.id);
  }

  const onRings = useCallback((next: Map<string, number>) => setRings(next), []);
  const onDatumY = useCallback((y: number) => setSpecimenDatum(y), []);
  const toggleGroup = useCallback(
    (id: string) =>
      setUserExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );

  const boreBottom = boreTop !== null && drawn ? boreTop + drawn.height : 0;
  const height = Math.max(specimenTop + specimenHeight, boreBottom, whyHeight) + 8;
  const location = view.location;
  const datumLabel = location
    ? location.startLine === location.endLine
      ? `±0 · line ${location.startLine} today`
      : `±0 · lines ${location.startLine}–${location.endLine} today`
    : "±0 · today";

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={whyRef} className="absolute top-0 right-0" style={{ left: geometry.whyLeft }}>
        <WhyZone
          view={view}
          byId={byId}
          effective={effective}
          pinned={state.pinnedClause}
          marked={marked}
          onHover={(id) => dispatch({ type: "hover-clause", id })}
          onPick={(id) => dispatch({ type: "toggle-pin", id })}
          onClear={() => dispatch({ type: "clear-pin" })}
          onRings={onRings}
          compact={!panel}
          phase={phase}
          failure={failure}
        />
      </div>

      <div
        ref={specimenRef}
        className="absolute left-0"
        style={{ top: specimenTop, width: panel ? geometry.panelWidth : "100%" }}
      >
        {renderSpecimen({
          layout,
          expanded: state.codeExpanded,
          onToggleExpanded: () => dispatch({ type: "toggle-code" }),
          targetDatumY,
          onDatumY,
        })}
      </div>

      {datumY !== null && boreTop !== null && bore && (
        <>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-visible"
            width="100%"
            height={height}
          >
            <line
              x1={geometry.ruleLeft}
              x2="100%"
              y1={datumY}
              y2={datumY}
              strokeWidth={2}
              className="stroke-li-datum"
            />
            {drawn && (
              <BoreGraphics
                layout={drawn}
                marks={marks}
                gaps={gaps}
                shift={geometry.shift}
                datumY={boreTop}
                inspected={state.inspected}
                trace={trace}
                arrival={arrival}
              />
            )}
          </svg>
          {panel && (
            <span
              className="absolute right-0 font-li-mono text-[10.5px] text-li-datum-ink"
              style={{ top: datumY + 4 }}
            >
              {datumLabel}
            </span>
          )}
          {drawn && (
            <section aria-label="History" className="pointer-events-none absolute inset-0">
              <BoreLabels
                layout={drawn}
                byId={byId}
                gaps={gaps}
                clauses={view.clauses}
                active={active}
                revealed={active ?? new Set()}
                hovered={state.hoverArtifact}
                inspected={state.inspected}
                shift={geometry.shift}
                width={geometry.labelWidth}
                onHover={(id) => dispatch({ type: "hover-artifact", id })}
                onInspect={(id) => dispatch({ type: "inspect", id })}
                onToggleGroup={toggleGroup}
                arrival={arrival}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
