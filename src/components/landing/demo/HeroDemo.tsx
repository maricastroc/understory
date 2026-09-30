"use client";

import { ScaledFrame } from "../parts/ScaledFrame";
import { LANDING_NOW, LANDING_PATH, landingLines, landingView } from "./landing-fixture";
import { PreviewBar } from "./PreviewBar";
import { placeRootsLabels, rootsHeight } from "./roots/place-roots-labels";
import { RootsDemo } from "./roots/RootsDemo";
import { rootsLayout } from "./roots/roots-layout";
import {
  ROOTS_FRAME_WIDTH,
  ROOTS_NARROW,
  ROOTS_WHY_HEIGHT,
  ROOTS_WIDE,
} from "./roots/roots-variants";
import { useDemoCase } from "./use-demo-case";

const LINE = landingView.location?.startLine ?? 9;
const WIDE = rootsLayout(landingView, LANDING_NOW, ROOTS_WIDE);
const NARROW = rootsLayout(landingView, LANDING_NOW, ROOTS_NARROW);
const FRAME = {
  width: ROOTS_FRAME_WIDTH,
  height:
    ROOTS_WHY_HEIGHT +
    Math.max(
      ...landingView.clauses.map((c) =>
        rootsHeight(WIDE, placeRootsLabels(WIDE, ROOTS_WIDE, new Set(c.citations))),
      ),
    ),
} as const;

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
      className="border border-li-divider bg-li-paper shadow-li-sm"
    >
      <PreviewBar
        repo={landingView.repo.name ?? landingView.repo.path}
        path={LANDING_PATH}
        line={LINE}
        question={landingView.question}
      />
      <div className="px-[15px] pt-6 pb-4 max-[900px]:px-4 max-[900px]:pt-5">
        <ScaledFrame width={FRAME.width} height={FRAME.height} className="max-[900px]:hidden">
          <RootsDemo {...common} variant={ROOTS_WIDE} layout={WIDE} />
        </ScaledFrame>
        <div className="min-[900px]:hidden">
          <RootsDemo {...common} variant={ROOTS_NARROW} layout={NARROW} />
        </div>
      </div>
    </section>
  );
}
