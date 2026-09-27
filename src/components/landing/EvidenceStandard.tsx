"use client";

import type { ReactNode } from "react";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { landingRejected, landingView } from "./demo/landing-fixture";
import { CONTAINER, H2, KICKER, SECTION } from "./parts/landing-classes";
import { ClauseSpecimen } from "./specimens/ClauseSpecimen";
import { QuoteSpecimen } from "./specimens/QuoteSpecimen";
import { SilentSpecimen } from "./specimens/SilentSpecimen";

function Frame({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <li className="relative flex flex-col gap-5 border border-li-divider p-6">
      <BlueprintCorners />
      <div className="flex h-33 flex-col justify-center">{children}</div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold text-li-ink">{title}</h3>
        <p className="text-sm leading-normal text-li-neutral-800">{body}</p>
      </div>
    </li>
  );
}

export function EvidenceStandard() {
  const issue = landingView.artifacts.find((a) => a.kind === "issue" && a.verified);
  const gap = landingView.gaps.find((g) => g.verified);
  const after = gap && landingView.artifacts.find((a) => a.id === gap.afterId);
  return (
    <section aria-labelledby="standard-title" className={SECTION}>
      <div className={`${CONTAINER} flex flex-col gap-9 py-18`}>
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
          <h2 id="standard-title" className={`${H2} max-w-140`}>
            Not a chat about your repo. A record you can audit.
          </h2>
          <span className={KICKER}>evidence &gt; assertions</span>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
          <Frame
            title="Every clause points to its sources"
            body="Each statement carries the letters of the artifacts behind it. The conclusion is an index to the record."
          >
            <ClauseSpecimen view={landingView} index={1} />
          </Frame>
          <Frame
            title="Citations are checked, not trusted"
            body="A deterministic check finds every quote in its source. A fabricated reference is caught before you see it."
          >
            {issue && <QuoteSpecimen artifact={issue} rejected={landingRejected} />}
          </Frame>
          <Frame
            title="It admits a cold trail"
            body="When history doesn't explain a line, the gap is shown as a gap, never filled with a plausible story."
          >
            {gap && after && <SilentSpecimen gap={gap} after={after} />}
          </Frame>
        </ul>
      </div>
    </section>
  );
}
