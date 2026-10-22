"use client";

import type { ReactNode } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { landingRejected, landingViewFor } from "./demo/landing-fixture";
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
  const t = useMessages().landing.standard;
  const landingView = landingViewFor(useLocale());
  const issue = landingView.artifacts.find((a) => a.kind === "issue" && a.verified);
  const gap = landingView.gaps.find((g) => g.verified);
  const after = gap && landingView.artifacts.find((a) => a.id === gap.afterId);
  return (
    <section aria-labelledby="standard-title" className={SECTION}>
      <div className={`${CONTAINER} flex flex-col gap-9 py-18`}>
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
          <h2 id="standard-title" className={`${H2} max-w-140`}>
            {t.title}
          </h2>
          <span className={KICKER}>{t.kicker}</span>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
          <Frame title={t.clauses.title} body={t.clauses.body}>
            <ClauseSpecimen view={landingView} index={1} />
          </Frame>
          <Frame title={t.citations.title} body={t.citations.body}>
            {issue && <QuoteSpecimen artifact={issue} rejected={landingRejected} />}
          </Frame>
          <Frame title={t.silence.title} body={t.silence.body}>
            {gap && after && <SilentSpecimen gap={gap} after={after} />}
          </Frame>
        </ul>
      </div>
    </section>
  );
}
