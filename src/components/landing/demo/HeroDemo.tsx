"use client";

import { Instrument } from "../../line-investigation/instrument/Instrument";
import type { SpecimenSlot } from "../../line-investigation/instrument/types";
import { CodeSpecimen } from "../../line-investigation/specimen/CodeSpecimen";
import { SPECIMEN_LAYOUTS } from "../../line-investigation/specimen/use-specimen-layout";
import { ScaledFrame } from "../parts/ScaledFrame";
import {
  LANDING_NOW,
  LANDING_PATH,
  landingBlame,
  landingLines,
  landingView,
} from "./landing-fixture";
import { PreviewBar } from "./PreviewBar";
import { useDemoCase } from "./use-demo-case";

const LINE = landingView.location?.startLine ?? 9;
const FRAME = { width: 1120, height: 584 } as const;

const specimen: SpecimenSlot = (slot) => (
  <CodeSpecimen
    path={LANDING_PATH}
    lines={landingLines}
    datum={{ start: LINE, end: LINE }}
    question={landingView.question}
    blame={landingBlame}
    blameStatus="ready"
    now={LANDING_NOW}
    static
    {...slot}
  />
);

export function HeroDemo() {
  const [state, dispatch] = useDemoCase(landingView.clauses[1].id);
  const common = {
    view: landingView,
    state,
    dispatch,
    now: LANDING_NOW,
    renderSpecimen: specimen,
    demo: true,
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
          <Instrument {...common} layout={SPECIMEN_LAYOUTS.wide} />
        </ScaledFrame>
        <div className="min-[900px]:hidden">
          <Instrument {...common} layout={SPECIMEN_LAYOUTS.strip} />
        </div>
      </div>
    </section>
  );
}
