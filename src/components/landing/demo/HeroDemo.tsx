"use client";

import { ScaledFrame } from "../parts/ScaledFrame";
import {
  LANDING_NOW,
  LANDING_PATH,
  landingLines,
  landingVersions,
  landingView,
} from "./landing-fixture";
import { StrataDemo } from "./strata/StrataDemo";
import { strataLayout } from "./strata/strata-layout";
import { STRATA_FRAME, STRATA_STACKED, STRATA_WIDE } from "./strata/strata-metrics";
import { useDemoCase } from "./use-demo-case";

const LINE = landingView.location?.startLine ?? 9;
const WIDE = strataLayout(landingView, landingVersions, LANDING_NOW, STRATA_WIDE);
const STACKED = strataLayout(landingView, landingVersions, LANDING_NOW, STRATA_STACKED);
const HEIGHT = Math.max(STRATA_FRAME.height, WIDE.bottom + STRATA_FRAME.footer + 8);

export function HeroDemo() {
  const [state, dispatch] = useDemoCase(landingView.clauses[1].id);
  const common = {
    view: landingView,
    lines: landingLines,
    path: LANDING_PATH,
    state,
    dispatch,
  } as const;

  return (
    <section
      aria-label={`Example investigation of ${LANDING_PATH} line ${LINE}`}
      className="overflow-hidden border border-strata-divider bg-strata-ground shadow-strata-sm"
    >
      <ScaledFrame width={STRATA_FRAME.width} height={HEIGHT} className="max-[1200px]:hidden">
        <StrataDemo {...common} m={STRATA_WIDE} layout={WIDE} height={HEIGHT} />
      </ScaledFrame>
      <div className="min-[1200px]:hidden">
        <StrataDemo {...common} m={STRATA_STACKED} layout={STACKED} />
      </div>
    </section>
  );
}
