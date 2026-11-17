"use client";

import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { formatMonthYear, shortAge } from "@/i18n/format";
import { gapBody } from "../../line-investigation/copy/gap-copy";
import { HATCH } from "../demo/strata/strata-hatch";
import { DRAW, EYEBROW, META, RAIL, WIDE_GRID, WIPE } from "./dig-classes";
import { DigSection } from "./DigSection";
import type { DigModel } from "./types";

const PLATE = "w-fit bg-li-paper px-1.5 -mx-1.5";

export function DigSilence({ model, question }: { model: DigModel; question: string }) {
  const locale = useLocale();
  const t = useMessages();
  const s = t.landing.dig.silence;
  const months = model.silentMonths;
  const missing = [t.artifact.kind.pull_request, t.artifact.kind.review, t.artifact.kind.issue];
  return (
    <DigSection
      id="dig-05"
      chapter="05"
      silent
      labelledBy="dig-silence"
      bleed={
        <span
          aria-hidden
          className="absolute inset-0 border-y border-dashed border-li-ink/35"
          style={{ backgroundImage: HATCH.band }}
        />
      }
    >
      <span
        aria-hidden
        className="absolute inset-y-8 left-[calc(var(--bore-x)_+_0.6rem)] w-2 bg-li-paper xl:left-[7.25rem] xl:w-2.5"
      >
        {months.map((iso, i) => (
          <span
            key={iso}
            data-dig-depth={`|${formatMonthYear(t.time, iso)}`}
            data-dig-offset="0"
            className="absolute inset-x-0 h-px bg-li-ink/55"
            style={{ top: `${((i + 0.5) / months.length) * 100}%` }}
          >
            {i % 4 === 3 && (
              <span className="absolute top-0 right-full mr-2 -translate-y-1/2 bg-li-paper px-1 font-li-mono text-xs whitespace-nowrap text-li-neutral-700 max-xl:hidden">
                {formatMonthYear(t.time, iso)}
              </span>
            )}
          </span>
        ))}
      </span>

      <div className={`relative flex flex-col gap-y-5 py-9 ${RAIL} ${WIDE_GRID} xl:items-center`}>
        <p className={`${EYEBROW} ${PLATE} xl:col-start-1 xl:row-start-1 xl:self-start`}>
          05<span className="text-li-gap-ink"> · {shortAge(t.time, model.silentDays)}</span>
        </p>

        <div className="max-w-[35rem] bg-li-paper px-5 py-6 xl:col-start-2 xl:row-start-1 xl:px-8 xl:py-8">
          <h2
            id="dig-silence"
            className="font-li-display text-[clamp(44px,12vw,68px)] leading-[0.94] font-semibold tracking-[-0.015em] text-balance text-strata-neutral-800"
          >
            {s.title}
          </h2>
          <p className="mt-4 text-[17px] leading-normal text-pretty text-li-neutral-800">
            {gapBody(model.gap, model.origin.artifact, locale)}
          </p>
          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 font-li-mono text-[12.5px] leading-5">
            {missing.map((kind) => (
              <span
                key={kind}
                className="border border-dashed border-li-gap px-2 whitespace-nowrap text-li-gap-ink"
              >
                ∅ {kind}
              </span>
            ))}
            <span className="text-li-neutral-700">{s.looked}</span>
          </p>
        </div>

        <div
          data-dig-item
          data-dig-id="silence"
          data-dig-offset="72"
          className="group/row relative xl:col-start-4 xl:row-start-1"
        >
          <span
            aria-hidden
            className={`absolute top-5 right-full w-10 border-t border-dashed border-li-gap max-xl:hidden ${DRAW}`}
          />
          <div
            className={`flex flex-col gap-1 border-l-2 border-dashed border-li-gap bg-li-paper py-2 pr-3 pl-3 delay-200 xl:border-l-0 ${WIPE}`}
          >
            <p className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-2 size-2.5 shrink-0 rounded-full border-[1.5px] border-dashed border-li-gap-ink max-xl:hidden"
              />
              <span className="text-lg leading-[1.45] font-medium text-li-gap-ink">{question}</span>
            </p>
            <p className={`${META} xl:pl-5`}>{t.landing.dig.answerOpen}</p>
          </div>
        </div>
      </div>
    </DigSection>
  );
}
