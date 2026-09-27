"use client";

import type { DiffResult } from "@git-investigator/core/diff/types";
import { useEffect, useMemo, useReducer, useRef } from "react";
import {
  readKeyPreference,
  writeKeyPreference,
} from "../../line-investigation/case/key-preference";
import { Toolbar } from "../../line-investigation/case/Toolbar";
import { useCaseKeyboard } from "../../line-investigation/case/use-case-keyboard";
import { useFocusReturn } from "../../line-investigation/case/use-focus-return";
import { evidenceEntries } from "../../line-investigation/copy/evidence-entries";
import { EvidenceDrawer } from "../../line-investigation/drawer/EvidenceDrawer";
import type { DrawerExtensions } from "../../line-investigation/drawer/types";
import { lineInvestigationFonts } from "../../line-investigation/fonts";
import type { ViewArtifact } from "../../line-investigation/model/types";
import {
  caseReducer,
  drawerOpen,
  effectiveClause,
  initialCaseState,
} from "../../line-investigation/state/case-reducer";
import { listOf, rangeText, regionSpan } from "../copy/region-copy";
import { buildPrView } from "../model/build-pr-view";
import { PrInstrument } from "./PrInstrument";
import { PrTitleRow } from "./PrTitleRow";

export function PrInvestigation({
  result,
  now,
  onDrill,
}: {
  result: DiffResult;
  now: number;
  onDrill?: (a: ViewArtifact) => void;
}) {
  const view = useMemo(() => buildPrView(result, { now }), [result, now]);
  const entries = useMemo(() => evidenceEntries(view), [view]);
  const order = useMemo(() => entries.map((e) => e.id), [entries]);
  const [state, dispatch] = useReducer(caseReducer, undefined, () =>
    initialCaseState(readKeyPreference()),
  );
  const firstKey = useRef(true);
  const open = drawerOpen(state);
  const regionKeys = useMemo(
    () => ({ order: view.regions.map((r) => r.id), tooltip: !!state.hoverArtifact && !open }),
    [view.regions, state.hoverArtifact, open],
  );

  useCaseKeyboard(state, dispatch, order, regionKeys);
  useFocusReturn(open);

  useEffect(() => {
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    writeKeyPreference(state.keyOpen);
  }, [state.keyOpen]);

  const effective = effectiveClause(state);
  const clause = view.clauses.find((c) => c.id === effective) ?? null;
  const focusRegion = state.hoverRegion ?? state.selectedRegion;
  const activeRegions = clause
    ? new Set(clause.regions)
    : focusRegion
      ? new Set([focusRegion])
      : null;
  const marked = new Set(
    focusRegion ? view.clauses.filter((c) => c.regions.includes(focusRegion)).map((c) => c.id) : [],
  );
  const activeArtifacts = activeRegions
    ? new Set(
        [...view.regionsOf]
          .filter(([, regions]) => regions.some((r) => activeRegions.has(r)))
          .map(([id]) => id),
      )
    : null;

  const gaps = view.gaps.length;
  const extensions: DrawerExtensions = {
    countLabel: `${entries.length} entries${gaps ? `, ${gaps} gap${gaps === 1 ? "" : "s"}` : ""}, deepest last`,
    aside: (entry) => (view.regionsOf.get(entry.id) ?? []).join(" ") || null,
    appearsIn: (entry) =>
      (view.regionsOf.get(entry.id) ?? []).flatMap((id) => {
        const region = view.regions.find((r) => r.id === id);
        if (!region) return [];
        return [
          {
            key: id,
            label: `${id} · ${region.file} ${rangeText(region)}`,
            onPick: () => {
              dispatch({ type: "close-drawer" });
              if (state.selectedRegion !== id) dispatch({ type: "select-region", id });
            },
          },
        ];
      }),
    quoteCaption: (clauseId) => {
      if (!clauseId) return undefined;
      const parts = clauseId.split("|").flatMap((id) => {
        if (id.startsWith("c")) return [`clause ${Number(id.slice(1)) + 1}`];
        const finding = Number(id.slice(1));
        const ids = view.regions.filter((r) => r.findings.includes(finding)).map((r) => r.id);
        return ids.length ? [regionSpan(ids)] : [];
      });
      return parts.length ? `for ${listOf(parts)}` : undefined;
    },
  };

  return (
    <div className={`${lineInvestigationFonts} flex flex-col gap-5.5 font-li-body text-li-ink`}>
      <PrTitleRow
        view={view}
        open={state.verdictOpen}
        onToggle={() => dispatch({ type: "toggle-verdict" })}
        onClose={() => dispatch({ type: "close-verdict" })}
      />
      <PrInstrument
        view={view}
        state={state}
        dispatch={dispatch}
        clause={clause}
        activeRegions={activeRegions}
        marked={marked}
      />
      <Toolbar
        count={entries.length}
        keyOpen={state.keyOpen}
        answer={view.mode === "synthesized" && result.summary ? result.summary : null}
        onOpenList={() => dispatch({ type: "open-list" })}
        onToggleKey={() => dispatch({ type: "toggle-key" })}
        legend="pr"
      />
      {open && (
        <EvidenceDrawer
          entries={entries}
          artifacts={view.artifacts}
          clauses={[...view.clauses, ...view.findingClauses]}
          inspected={state.inspected}
          active={activeArtifacts}
          onInspect={(id) => dispatch({ type: "inspect", id })}
          onList={() => dispatch({ type: "open-list" })}
          onClose={() => dispatch({ type: "close-drawer" })}
          onStep={(delta) => dispatch({ type: "step", order, delta })}
          onDrill={onDrill}
          extensions={extensions}
        />
      )}
    </div>
  );
}
