"use client";

import type { DigResult } from "@understory/core/types";
import { type ReactNode, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { evidenceEntries } from "../copy/evidence-entries";
import { EvidenceDrawer } from "../drawer/EvidenceDrawer";
import { Instrument } from "../instrument/Instrument";
import type { SpecimenSlot } from "../instrument/types";
import { buildInvestigationView } from "../model/build-investigation-view";
import type { ViewArtifact } from "../model/types";
import type { SpecimenLayout } from "../specimen/types";
import { caseReducer, drawerOpen, effectiveClause, initialCaseState } from "../state/case-reducer";
import { readKeyPreference, writeKeyPreference } from "./key-preference";
import { TitleRow } from "./TitleRow";
import { Toolbar } from "./Toolbar";
import { useCaseKeyboard } from "./use-case-keyboard";
import type { CasePhase } from "./types";
import { useFocusReturn } from "./use-focus-return";

export function LineInvestigation({
  result,
  pending,
  now,
  layout,
  renderSpecimen,
  onDrill,
  onFollowUp,
  phase,
  failure,
}: {
  result: DigResult;
  pending: boolean;
  now: number;
  layout: SpecimenLayout;
  renderSpecimen: SpecimenSlot;
  onDrill?: (a: ViewArtifact) => void;
  onFollowUp?: () => void;
  phase?: CasePhase;
  failure?: ReactNode;
}) {
  const view = useMemo(
    () => buildInvestigationView(result, { now, pending }),
    [result, now, pending],
  );
  const entries = useMemo(() => evidenceEntries(view), [view]);
  const order = useMemo(() => entries.map((e) => e.id), [entries]);
  const [state, dispatch] = useReducer(caseReducer, undefined, () =>
    initialCaseState(readKeyPreference()),
  );
  const firstKey = useRef(true);
  const [collectedHere] = useState(() => phase === "collecting");

  useCaseKeyboard(state, dispatch, order);
  useFocusReturn(drawerOpen(state));

  useEffect(() => {
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    writeKeyPreference(state.keyOpen);
  }, [state.keyOpen]);

  const effective = effectiveClause(state);
  const clause = view.clauses.find((c) => c.id === effective);
  const active = clause ? new Set(clause.citations) : null;

  return (
    <div className="flex flex-col gap-5.5 font-li-body text-li-ink">
      <TitleRow
        view={view}
        verdictOpen={state.verdictOpen}
        onToggleVerdict={() => dispatch({ type: "toggle-verdict" })}
        onCloseVerdict={() => dispatch({ type: "close-verdict" })}
        onFollowUp={onFollowUp}
        phase={phase}
      />
      <Instrument
        view={view}
        state={state}
        dispatch={dispatch}
        layout={layout}
        now={now}
        renderSpecimen={renderSpecimen}
        phase={phase}
        failure={failure}
        arrive={collectedHere && !phase}
      />
      {!phase && (
        <Toolbar
          count={entries.length}
          keyOpen={state.keyOpen}
          answer={view.clauses.length && !view.clauses[0].silent ? view.answer : null}
          onOpenList={() => dispatch({ type: "open-list" })}
          onToggleKey={() => dispatch({ type: "toggle-key" })}
        />
      )}
      {drawerOpen(state) && (
        <EvidenceDrawer
          entries={entries}
          artifacts={view.artifacts}
          clauses={view.clauses}
          inspected={state.inspected}
          active={active}
          onInspect={(id) => dispatch({ type: "inspect", id })}
          onList={() => dispatch({ type: "open-list" })}
          onClose={() => dispatch({ type: "close-drawer" })}
          onStep={(delta) => dispatch({ type: "step", order, delta })}
          onDrill={onDrill}
        />
      )}
    </div>
  );
}
