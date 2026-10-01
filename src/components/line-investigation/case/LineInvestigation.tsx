"use client";

import type { DigResult } from "@understory/core/types";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Answer } from "../answer/Answer";
import { tickText } from "../copy/artifact-copy";
import { caseSubject } from "../copy/subject-copy";
import { historyModel } from "../history/history-model";
import { HistorySection } from "../history/HistorySection";
import type { SpecimenSlot } from "../instrument/types";
import { buildInvestigationView } from "../model/build-investigation-view";
import { cssEscape, reveal } from "../parts/dom";
import type { ViewArtifact } from "../model/types";
import type { SpecimenLayout } from "../specimen/types";
import { caseReducer, initialCaseState } from "../state/case-reducer";
import { readKeyPreference, writeKeyPreference } from "./key-preference";
import { TitleRow } from "./TitleRow";
import { Toolbar } from "./Toolbar";
import { useCaseKeyboard } from "./use-case-keyboard";
import type { AnalysisLanguage, CasePhase } from "./types";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function LineInvestigation({
  result,
  pending,
  analysis,
  now,
  layout,
  renderSpecimen,
  onDrill,
  onFollowUp,
  onBackToQuestion,
  parent,
  phase,
  failure,
}: {
  result: DigResult;
  pending: boolean;
  analysis?: AnalysisLanguage;
  now: number;
  layout: SpecimenLayout;
  renderSpecimen: SpecimenSlot;
  onDrill?: (a: ViewArtifact) => void;
  onFollowUp?: () => void;
  onBackToQuestion?: () => void;
  parent?: { id: string; question?: string; onOpen?: () => void };
  phase?: CasePhase;
  failure?: ReactNode;
}) {
  const view = useMemo(
    () => buildInvestigationView(result, { now, pending }),
    [result, now, pending],
  );
  const model = useMemo(() => historyModel(view, now), [view, now]);
  const subject = useMemo(
    () => caseSubject(view, result.evidence.anchor),
    [view, result.evidence.anchor],
  );
  const note = result.evidence.note;
  const [state, dispatch] = useReducer(caseReducer, undefined, () =>
    initialCaseState(readKeyPreference()),
  );
  const firstKey = useRef(true);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const lastPinned = useRef<string | null>(null);
  const [collectedHere] = useState(() => phase === "collecting");

  useCaseKeyboard(dispatch);

  useEffect(() => {
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    writeKeyPreference(state.keyOpen);
  }, [state.keyOpen]);

  const clauseButton = useCallback(
    (id: string) =>
      answerRef.current?.querySelector<HTMLButtonElement>(
        `[data-clause="${cssEscape(id)}"] > button`,
      ) ?? null,
    [],
  );

  useEffect(() => {
    const was = lastPinned.current;
    lastPinned.current = state.pinnedClause;
    if (!was || state.pinnedClause) return;
    const focused = document.activeElement;
    if (!focused || focused === document.body || !focused.isConnected) clauseButton(was)?.focus();
  }, [state.pinnedClause, clauseButton]);

  const back = useCallback(
    (clause: string | null, source?: string) => {
      if (clause && source) dispatch({ type: "trace", clause, source });
      requestAnimationFrame(() => {
        const target = clause ? clauseButton(clause) : null;
        reveal(target ?? answerRef.current, "center");
        target?.focus({ preventScroll: true });
      });
    },
    [clauseButton],
  );

  const historyCount = model.strata.length;
  const hasHistory = !phase && (historyCount > 0 || model.loose.length > 0);
  const artifactCount = model.strata.reduce((n, s) => n + s.members.length, 0) + model.loose.length;
  const summary = !hasHistory
    ? null
    : subject.kind === "anchor"
      ? `Around ${subject.label} · ${plural(artifactCount, "artifact")}`
      : historyCount > 0
        ? `History · ${plural(historyCount, "change")}${
            model.originDays !== null ? ` over ${tickText(model.originDays).replace("−", "")}` : ""
          }`
        : `History · ${plural(model.loose.length, "artifact")}`;

  return (
    <div className="flex flex-col gap-5.5 font-li-body text-li-ink">
      {parent && (
        <p className="-mb-3 font-li-mono text-[11.5px] text-li-text-subtle">
          ↳ continues{" "}
          {parent.onOpen ? (
            <button
              type="button"
              onClick={parent.onOpen}
              className="cursor-pointer text-li-ink underline decoration-li-neutral-400 underline-offset-2 hover:decoration-li-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
            >
              {parent.id}
            </button>
          ) : (
            <span className="text-li-ink">{parent.id}</span>
          )}
          {parent.question && <span> · drilled from “{parent.question}”</span>}
        </p>
      )}
      <TitleRow
        view={view}
        subject={subject}
        verdictOpen={state.verdictOpen}
        onToggleVerdict={() => dispatch({ type: "toggle-verdict" })}
        onCloseVerdict={() => dispatch({ type: "close-verdict" })}
        onFollowUp={onFollowUp}
        onBackToQuestion={onBackToQuestion}
        phase={phase}
      />
      {note && !phase && (
        <p className="-mt-2 max-w-190 border-l-2 border-li-neutral-300 pl-3 text-[13px] leading-normal text-li-text-subtle">
          {note}
        </p>
      )}
      <div ref={answerRef} className="scroll-mt-20">
        <Answer
          view={view}
          state={state}
          dispatch={dispatch}
          layout={layout}
          renderSpecimen={renderSpecimen}
          subject={subject}
          maxDays={model.originDays ?? 0}
          onDrill={onDrill}
          phase={phase}
          failure={failure}
          analysis={analysis}
        />
      </div>
      {!phase && (
        <Toolbar
          history={summary}
          keyOpen={state.keyOpen}
          answer={view.clauses.length && !view.clauses[0].silent ? view.answer : null}
          onHistory={() => reveal(document.getElementById("history"), "start")}
          onToggleKey={() => dispatch({ type: "toggle-key" })}
        />
      )}
      {hasHistory && (
        <HistorySection
          model={model}
          view={view}
          subject={subject}
          state={state}
          dispatch={dispatch}
          onBack={back}
          onDrill={onDrill}
          arrive={collectedHere}
        />
      )}
    </div>
  );
}
