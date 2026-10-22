"use client";

import type { ReactNode } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { LANDING_PATH, landingLines, landingViewFor } from "./demo/landing-fixture";
import { CONTAINER, H2, SECTION } from "./parts/landing-classes";
import { HeadlineSpecimen } from "./specimens/HeadlineSpecimen";
import { LineSpecimen } from "./specimens/LineSpecimen";
import { TrailSpecimen } from "./specimens/TrailSpecimen";

function Step({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3.5">
      <div className="flex h-24 flex-col justify-center">{children}</div>
      <h3 className="flex items-baseline gap-2.5">
        <span className="font-li-mono text-xs text-li-datum-ink">{n}</span>
        <span className="text-base font-semibold text-li-ink">{title}</span>
      </h3>
      <p className="text-sm leading-normal text-li-neutral-800">{body}</p>
    </li>
  );
}

export function Method() {
  const t = useMessages().landing.method;
  const landingView = landingViewFor(useLocale());
  const line = landingView.location?.startLine ?? 9;
  return (
    <section id="method" aria-labelledby="method-title" className={`${SECTION} scroll-mt-15`}>
      <div className={`${CONTAINER} flex flex-col gap-9 py-18`}>
        <h2 id="method-title" className={`${H2} max-w-140`}>
          {t.title}
        </h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-8">
          <Step n="01" title={t.point.title} body={t.point.body}>
            <LineSpecimen
              lines={landingLines}
              path={LANDING_PATH}
              line={line}
              question={landingView.question}
            />
          </Step>
          <Step n="02" title={t.follow.title} body={t.follow.body}>
            <TrailSpecimen />
          </Step>
          <Step n="03" title={t.read.title} body={t.read.body}>
            <HeadlineSpecimen clause={landingView.clauses[0]} silence={t.silence} />
          </Step>
        </ol>
      </div>
    </section>
  );
}
