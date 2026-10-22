"use client";

import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { ScaledFrame } from "../parts/ScaledFrame";
import {
  LANDING_NOW,
  LANDING_PATH,
  landingLines,
  landingVersionsFor,
  landingViewFor,
} from "./landing-fixture";
import { StrataDemo } from "./strata/StrataDemo";
import { strataLayout } from "./strata/strata-layout";
import { STRATA_FRAME, STRATA_STACKED, STRATA_WIDE } from "./strata/strata-metrics";
import { useDemoCase } from "./use-demo-case";

function demoFor(locale: Locale) {
  const view = landingViewFor(locale);
  const versions = landingVersionsFor(locale);
  const wide = strataLayout(view, versions, LANDING_NOW, STRATA_WIDE);
  const stacked = strataLayout(view, versions, LANDING_NOW, STRATA_STACKED);
  const height = Math.max(STRATA_FRAME.height, wide.bottom + STRATA_FRAME.footer + 8);
  return { view, wide, stacked, height };
}

const demos = new Map<Locale, ReturnType<typeof demoFor>>();

function cachedDemo(locale: Locale) {
  const known = demos.get(locale);
  if (known) return known;
  const demo = demoFor(locale);
  demos.set(locale, demo);
  return demo;
}

export function HeroDemo() {
  const locale = useLocale();
  const t = useMessages().landing.demo;
  const { view, wide, stacked, height } = cachedDemo(locale);
  const line = view.location?.startLine ?? 9;
  const [state, dispatch] = useDemoCase(view.clauses[1].id);
  const common = {
    view,
    lines: landingLines,
    path: LANDING_PATH,
    state,
    dispatch,
  } as const;

  return (
    <section
      aria-label={t.region(LANDING_PATH, line)}
      className="overflow-hidden border border-strata-divider bg-strata-ground shadow-strata-sm"
    >
      <ScaledFrame width={STRATA_FRAME.width} height={height} className="max-[1200px]:hidden">
        <StrataDemo {...common} m={STRATA_WIDE} layout={wide} height={height} />
      </ScaledFrame>
      <div className="min-[1200px]:hidden">
        <StrataDemo {...common} m={STRATA_STACKED} layout={stacked} />
      </div>
    </section>
  );
}
