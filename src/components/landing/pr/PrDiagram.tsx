"use client";

import { useMemo } from "react";
import { computePrSectionLayout } from "../../pr-investigation/layout/compute-pr-section-layout";
import { SectionGraphics } from "../../pr-investigation/section/SectionGraphics";
import { SectionCaptions } from "../../pr-investigation/section/SectionCaptions";
import { ScaledFrame } from "../parts/ScaledFrame";
import { landingPrView } from "./landing-pr-fixture";
import { prDiagramLabel } from "./pr-diagram-label";

const FRAME = { width: 520, axisX: 56, datumY: 50 } as const;

export function PrDiagram({ className = "" }: { className?: string }) {
  const layout = useMemo(
    () =>
      computePrSectionLayout(landingPrView, {
        datumY: FRAME.datumY,
        axisX: FRAME.axisX,
        right: FRAME.width,
        selected: null,
        showLetters: false,
      }),
    [],
  );
  return (
    <div role="img" aria-label={prDiagramLabel(landingPrView)} className={className}>
      <ScaledFrame width={FRAME.width} height={layout.bottom}>
        <SectionGraphics
          view={landingPrView}
          layout={layout}
          width={FRAME.width}
          activeRegions={null}
          clause={null}
          pinned={false}
          selected={null}
          inspected={null}
        />
        <SectionCaptions view={landingPrView} layout={layout} />
      </ScaledFrame>
    </div>
  );
}
