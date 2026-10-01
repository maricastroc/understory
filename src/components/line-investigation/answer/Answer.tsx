"use client";

import type { Dispatch, ReactNode } from "react";
import { useMemo } from "react";
import type { AnalysisLanguage, CasePhase } from "../case/types";
import { clauseSources } from "../copy/source-copy";
import type { CaseSubject } from "../copy/types";
import type { SpecimenSlot } from "../instrument/types";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { SPECIMEN } from "../specimen/specimen-metrics";
import type { SpecimenLayout } from "../specimen/types";
import { effectiveClause } from "../state/case-reducer";
import type { CaseAction, CaseState } from "../state/types";
import { ClauseEvidence } from "../why/ClauseEvidence";
import { WhyZone } from "../why/WhyZone";

const PANEL_WIDTH = { wide: 460, narrow: 420 } as const;
const noop = () => {};

export function Answer({
  view,
  state,
  dispatch,
  layout,
  renderSpecimen,
  subject,
  maxDays,
  onDrill,
  phase,
  failure,
  analysis,
}: {
  view: InvestigationView;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
  layout: SpecimenLayout;
  renderSpecimen: SpecimenSlot;
  subject: CaseSubject;
  maxDays: number;
  onDrill?: (a: ViewArtifact) => void;
  phase?: CasePhase;
  failure?: ReactNode;
  analysis?: AnalysisLanguage;
}) {
  const panel = layout.mode === "panel";
  const byId = useMemo(() => new Map(view.artifacts.map((a) => [a.id, a])), [view.artifacts]);
  const marked = new Set<string>();
  if (state.hoverArtifact) {
    for (const c of view.clauses) if (c.citations.includes(state.hoverArtifact)) marked.add(c.id);
  }

  const why = (
    <WhyZone
      view={view}
      byId={byId}
      effective={effectiveClause(state)}
      pinned={state.pinnedClause}
      marked={marked}
      onHover={(id) => dispatch({ type: "hover-clause", id })}
      onPick={(id) => dispatch({ type: "toggle-pin", id })}
      compact={!panel}
      phase={phase}
      failure={failure}
      analysis={analysis}
      renderEvidence={(clause, id) => {
        const sources = clauseSources(clause, view);
        return (
          <ClauseEvidence
            id={id}
            clause={clause}
            sources={sources}
            sourceId={state.source}
            view={view}
            subject={subject}
            maxDays={maxDays}
            onShow={(source) => dispatch({ type: "show-source", id: source })}
            onStep={(delta) =>
              dispatch({ type: "step-source", order: sources.map((s) => s.id), delta })
            }
            onClose={() => dispatch({ type: "clear-pin" })}
            onLocate={(target) => dispatch({ type: "locate", id: target })}
            onDrill={onDrill}
          />
        );
      }}
    />
  );
  const specimen = renderSpecimen({
    layout,
    expanded: state.codeExpanded,
    onToggleExpanded: () => dispatch({ type: "toggle-code" }),
    targetDatumY: SPECIMEN.defaultDatumY,
    onDatumY: noop,
  });

  if (!panel) {
    return (
      <div data-answer="strip" className="flex flex-col gap-4">
        {why}
        {specimen}
      </div>
    );
  }
  return (
    <div
      data-answer="panel"
      className="grid items-start gap-x-8"
      style={{
        gridTemplateColumns: `${layout.width === "narrow" ? PANEL_WIDTH.narrow : PANEL_WIDTH.wide}px minmax(0, 1fr)`,
      }}
    >
      {specimen}
      {why}
    </div>
  );
}
