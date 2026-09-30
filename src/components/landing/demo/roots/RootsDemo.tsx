"use client";

import { type Dispatch, useMemo } from "react";
import type { InvestigationView } from "../../../line-investigation/model/types";
import { datumToken } from "../../../line-investigation/specimen/datum-token";
import { highlightLines } from "../../../line-investigation/specimen/highlight-code";
import { effectiveClause } from "../../../line-investigation/state/case-reducer";
import type { CaseAction, CaseState } from "../../../line-investigation/state/types";
import { WhyZone } from "../../../line-investigation/why/WhyZone";
import { placeRootsLabels, rootsHeight } from "./place-roots-labels";
import { rootsTrace } from "./roots-layout";
import { RootsCode } from "./RootsCode";
import { RootsGraphics } from "./RootsGraphics";
import { RootsLabels } from "./RootsLabels";
import { RootsNotes } from "./RootsNotes";
import { ROOTS_WHY_HEIGHT } from "./roots-variants";
import type { RootsLayout, RootsVariant } from "./types";

const NONE = new Set<string>();
const WHY_WIDTH = 720;
const noop = () => {};

export function RootsDemo({
  view,
  lines,
  path,
  variant,
  layout,
  state,
  dispatch,
}: {
  view: InvestigationView;
  lines: string[];
  path: string;
  variant: RootsVariant;
  layout: RootsLayout;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
}) {
  const datum = view.location?.startLine ?? 1;
  const segments = useMemo(() => highlightLines(lines, path), [lines, path]);
  const line = lines[datum - 1] ?? "";
  const token = useMemo(() => datumToken(view.question, line), [view.question, line]);
  const byId = useMemo(() => new Map(view.artifacts.map((a) => [a.id, a])), [view.artifacts]);
  const effective = effectiveClause(state);
  const clause = view.clauses.find((c) => c.id === effective) ?? null;
  const active = useMemo(() => (clause ? new Set(clause.citations) : null), [clause]);

  const labels = placeRootsLabels(layout, variant, active ?? NONE);
  const trace =
    clause && !clause.silent ? rootsTrace(layout, variant.stemX, clause.citations) : null;
  const height = rootsHeight(layout, labels);
  const wide = variant.mode === "wide";
  const mid = token ? (token.start + token.end) / 2 : line.length / 2;
  const codeLeft = wide ? Math.round(variant.stemX - 34 - mid * variant.font * 0.6) : 0;
  const whyLeft = Math.max(0, codeLeft - 30);

  return (
    <div
      data-roots={variant.mode}
      className="flex flex-col font-li-body text-li-ink"
      style={{ width: variant.width ?? undefined }}
    >
      <div
        style={
          wide
            ? { height: ROOTS_WHY_HEIGHT, paddingLeft: whyLeft, maxWidth: whyLeft + WHY_WIDTH }
            : { paddingBottom: 4 }
        }
      >
        <WhyZone
          view={view}
          byId={byId}
          effective={effective}
          pinned={state.pinnedClause}
          marked={NONE}
          onHover={(id) => dispatch({ type: "hover-clause", id })}
          onPick={(id) => dispatch({ type: "toggle-pin", id })}
          onClear={() => dispatch({ type: "clear-pin" })}
          onRings={noop}
          compact={!wide}
          demo
        />
      </div>
      <div className="relative" style={{ height }}>
        <RootsGraphics
          layout={layout}
          variant={variant}
          labels={labels}
          active={active}
          trace={trace}
          height={height}
        />
        <RootsCode
          variant={variant}
          segments={segments}
          datum={datum}
          token={token}
          left={codeLeft}
        />
        <RootsNotes layout={layout} variant={variant} datum={datum} />
        <RootsLabels labels={labels} view={view} active={active} variant={variant} />
      </div>
    </div>
  );
}
