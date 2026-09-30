"use client";

import { type Dispatch, useId, useMemo } from "react";
import type { InvestigationView } from "../../../line-investigation/model/types";
import { datumToken } from "../../../line-investigation/specimen/datum-token";
import { highlightLines } from "../../../line-investigation/specimen/highlight-code";
import { useHorizontalOverflow } from "../../../line-investigation/specimen/use-horizontal-overflow";
import { effectiveClause } from "../../../line-investigation/state/case-reducer";
import type { CaseAction, CaseState } from "../../../line-investigation/state/types";
import { StrataBore } from "./StrataBore";
import { StrataLegend, StrataTopBar } from "./StrataChrome";
import { StrataClauses } from "./StrataClauses";
import { StrataGround } from "./StrataGround";
import { StrataQuestion } from "./StrataQuestion";
import { StrataRecords } from "./StrataRecords";
import { StrataSilence } from "./StrataSilence";
import { StrataSurface } from "./StrataSurface";
import { originText, summaryText } from "./strata-copy";
import { strataTrace } from "./strata-layout";
import { STRATA_COLUMNS, STRATA_FRAME } from "./strata-metrics";
import type { StrataLayout, StrataMetrics } from "./types";

export function StrataDemo({
  view,
  lines,
  path,
  m,
  layout,
  height,
  state,
  dispatch,
}: {
  view: InvestigationView;
  lines: string[];
  path: string;
  m: StrataMetrics;
  layout: StrataLayout;
  height?: number;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
}) {
  const id = useId().replace(/:/g, "");
  const [scrollRef, scrolls] = useHorizontalOverflow();
  const wide = m.mode === "wide";
  const datum = view.location?.startLine ?? 1;
  const segments = useMemo(() => highlightLines(lines, path), [lines, path]);
  const line = lines[datum - 1] ?? "";
  const token = useMemo(() => datumToken(view.question, line), [view.question, line]);
  const byId = useMemo(() => new Map(view.artifacts.map((a) => [a.id, a])), [view.artifacts]);
  const clauseId = effectiveClause(state);
  const clause = view.clauses.find((c) => c.id === clauseId) ?? null;
  const lit = useMemo(() => (clause ? new Set(clause.citations) : null), [clause]);
  const trace = clause ? strataTrace(layout, clause) : null;
  const col = token ? (token.start + token.end) / 2 : Math.max(0, line.search(/\S/)) + 0.5;
  const tokenText = token ? line.slice(token.start, token.end) : null;
  const widest = Math.max(line.length, ...layout.strata.map((s) => s.version?.text.length ?? 0));
  const origin = originText(datum, layout.strata.at(-1)?.artifact.daysBeforeNow ?? null);
  const headingId = `${id}-why`;

  const topBar = (
    <StrataTopBar
      repo={view.repo.name ?? view.repo.path}
      path={view.location?.file ?? ""}
      line={datum}
      summary={summaryText(view)}
      wide={wide}
    />
  );
  const drawing = (
    <>
      <StrataGround layout={layout} m={m} />
      <StrataSurface
        m={m}
        segments={segments}
        datum={datum}
        token={token}
        bandEnd={line.length + 2}
      />
      <StrataBore
        layout={layout}
        m={m}
        col={col}
        token={token}
        lit={lit}
        trace={trace}
        slots={layout.clauses}
        clause={clauseId}
      />
      <StrataRecords
        layout={layout}
        m={m}
        view={view}
        datum={datum}
        active={lit}
        clause={clauseId}
      />
      <StrataSilence layout={layout} m={m} byId={byId} />
    </>
  );
  const heading = (
    <h3 id={headingId} className="font-li-mono text-[11px] font-normal text-strata-neutral-700">
      reconstructed why · read downward
    </h3>
  );
  const clauses = (
    <StrataClauses
      view={view}
      byId={byId}
      slots={wide ? layout.clauses : null}
      active={clauseId}
      dispatch={dispatch}
      labelledBy={headingId}
      idPrefix={id}
    />
  );

  if (wide) {
    return (
      <div
        data-strata="wide"
        className="relative overflow-hidden bg-strata-ground font-li-body text-strata-ink"
        style={{ width: STRATA_FRAME.width, height: height ?? STRATA_FRAME.height }}
      >
        <div className="absolute inset-x-0 top-0">{topBar}</div>
        {drawing}
        <div
          className="absolute right-10"
          style={{ left: STRATA_COLUMNS.question, top: m.datumY - 90 }}
        >
          <StrataQuestion question={view.question} token={tokenText} line={datum} wide />
        </div>
        <div className="absolute" style={{ left: STRATA_COLUMNS.question, top: m.datumY + 26 }}>
          {heading}
        </div>
        {clauses}
        <div
          className="absolute inset-x-0 bottom-0 border-t border-strata-divider"
          style={{ height: STRATA_FRAME.footer }}
        >
          <StrataLegend origin={origin} wide />
        </div>
      </div>
    );
  }

  return (
    <div
      data-strata="stacked"
      className="flex flex-col bg-strata-ground font-li-body text-strata-ink"
    >
      {topBar}
      <div className="px-4 pt-5">
        <StrataQuestion question={view.question} token={tokenText} line={datum} wide={false} />
      </div>
      <div className="flex flex-col gap-2 px-4 pt-5 pb-4">
        {heading}
        {clauses}
      </div>
      <div
        ref={scrollRef}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? "region" : undefined}
        aria-label={scrolls ? "Line history, scroll sideways for long lines" : undefined}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-strata-bore-ink"
      >
        <div
          className="relative font-li-mono"
          style={{
            height: layout.bottom + 12,
            minWidth: `calc(${m.codeX + 16}px + ${widest + 2}ch)`,
            fontSize: m.code.font,
          }}
        >
          {drawing}
        </div>
      </div>
      <div className="border-t border-strata-divider">
        <StrataLegend origin={origin} wide={false} />
      </div>
    </div>
  );
}
