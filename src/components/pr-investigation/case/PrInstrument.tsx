"use client";

import { type Dispatch, useEffect, useMemo, useRef, useState } from "react";
import { useElementHeight } from "../../line-investigation/instrument/use-element-height";
import {
  SPECIMEN_LAYOUTS,
  useSpecimenLayout,
} from "../../line-investigation/specimen/use-specimen-layout";
import type { CaseAction, CaseState } from "../../line-investigation/state/types";
import { computePrSectionLayout } from "../layout/compute-pr-section-layout";
import { PR_SECTION as G } from "../layout/pr-geometry";
import { RegionList } from "../list/RegionList";
import { RegionStrip } from "../list/RegionStrip";
import type { PrClause, PrView } from "../model/types";
import { SectionGraphics } from "../section/SectionGraphics";
import { SectionOverlay } from "../section/SectionOverlay";
import { PrWhyZone } from "../why/PrWhyZone";
import { deepestRegions } from "./deepest-regions";
import { useElementWidth } from "./use-element-width";

const PANEL = { listWidth: 400, whyLeft: 432, axisX: 470, minDatumY: 300, whyToDatum: 46 } as const;
const FLOW = { axisX: 60, datumY: 46 } as const;
const COMPACT_CORES = 4;

export function PrInstrument({
  view,
  state,
  dispatch,
  clause,
  activeRegions,
  marked,
}: {
  view: PrView;
  state: CaseState;
  dispatch: Dispatch<CaseAction>;
  clause: PrClause | null;
  activeRegions: Set<string> | null;
  marked: Set<string>;
}) {
  const responsive = useSpecimenLayout();
  const panel = responsive.mode === "panel";
  const compact = responsive === SPECIMEN_LAYOUTS.compact;
  const [boxRef, width] = useElementWidth();
  const [whyRef, whyHeight] = useElementHeight();
  const [listRef, listHeight] = useElementHeight();
  const [showAll, setShowAll] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const selected = state.selectedRegion;
  const drawer = state.inspected !== null || state.drawerList;
  const shown = useMemo(
    () => (compact && !showAll ? deepestRegions(view, COMPACT_CORES) : view),
    [compact, showAll, view],
  );
  const hidden = view.regions.length - shown.regions.length;
  const axisX = panel ? PANEL.axisX : FLOW.axisX;
  const datumY = panel ? Math.max(PANEL.minDatumY, whyHeight + PANEL.whyToDatum) : FLOW.datumY;
  const inner = compact
    ? Math.max(width, axisX + G.firstCoreOffset + shown.regions.length * G.minStep + G.rightPad)
    : width;

  const layout = useMemo(
    () =>
      width > 0
        ? computePrSectionLayout(shown, {
            datumY,
            axisX,
            right: inner,
            selected,
            showLetters: selected !== null && clause === null,
          })
        : null,
    [shown, width, inner, datumY, axisX, selected, clause],
  );

  useEffect(() => {
    if (!compact || !selected || !layout || !scroller.current) return;
    const core = layout.cores.find((c) => c.regionIds.includes(selected));
    if (core)
      scroller.current.scrollTo({ left: Math.max(0, core.x - width / 2), behavior: "smooth" });
  }, [compact, selected, layout, width]);

  const pickRegion = (id: string) => {
    if (compact && !shown.regions.some((r) => r.id === id)) setShowAll(true);
    dispatch({ type: "select-region", id });
  };
  const hoverRegion = (id: string | null) => dispatch({ type: "hover-region", id });

  const why = (
    <PrWhyZone
      view={view}
      effective={clause?.id ?? null}
      pinned={state.pinnedClause}
      selected={selected}
      marked={marked}
      compact={!panel}
      onHover={(id) => dispatch({ type: "hover-clause", id })}
      onPick={(id) => dispatch({ type: "toggle-pin", id })}
      onClear={() => dispatch({ type: "clear-all" })}
    />
  );

  const section = layout && (
    <>
      <SectionGraphics
        view={shown}
        layout={layout}
        width={inner}
        activeRegions={activeRegions}
        clause={clause}
        pinned={state.pinnedClause === clause?.id}
        selected={selected}
        inspected={state.inspected}
      />
      <SectionOverlay
        view={shown}
        layout={layout}
        width={inner}
        activeRegions={activeRegions}
        clause={clause}
        selected={selected}
        hoverArtifact={state.hoverArtifact}
        showTooltip={!drawer}
        onHoverRegion={hoverRegion}
        onSelectRegion={pickRegion}
        onHoverArtifact={(id) => dispatch({ type: "hover-artifact", id })}
        onInspect={(id) => dispatch({ type: "inspect", id })}
      />
    </>
  );

  if (panel) {
    const height = Math.max(listHeight, layout?.bottom ?? datumY + G.minCore) + 8;
    return (
      <div ref={boxRef} className="relative w-full" style={{ height }}>
        <div ref={listRef} className="absolute top-0 left-0" style={{ width: PANEL.listWidth }}>
          <RegionList
            view={view}
            selected={selected}
            active={activeRegions}
            onPick={pickRegion}
            onHover={hoverRegion}
          />
        </div>
        <div ref={whyRef} className="absolute top-0 right-0" style={{ left: PANEL.whyLeft }}>
          {why}
        </div>
        {section}
      </div>
    );
  }

  return (
    <div ref={boxRef} className="flex w-full flex-col gap-4">
      <RegionStrip
        view={view}
        selected={selected}
        active={activeRegions}
        onPick={pickRegion}
        onHover={hoverRegion}
      />
      {why}
      {compact && hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-fit cursor-pointer border border-li-ink px-1.5 font-li-mono text-[10.5px] text-li-ink hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
        >
          +{hidden} regions
        </button>
      )}
      <div ref={scroller} className={compact ? "overflow-x-auto" : undefined}>
        <div className="relative" style={{ width: inner || "100%", height: layout?.bottom ?? 0 }}>
          {section}
        </div>
      </div>
    </div>
  );
}
