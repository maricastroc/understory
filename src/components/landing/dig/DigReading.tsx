"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { longAge } from "@/i18n/format";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import { DIG_HATCH } from "./dig-hatch";
import { CONTAINER } from "../parts/landing-classes";
import { AT_TOKEN, EYEBROW, META, WIDE_GRID } from "./dig-classes";
import type { DigModel } from "./types";

const COLUMN = "flex flex-col gap-3 border-t pt-4";
const FIGURE = "font-li-display text-[32px] leading-none font-semibold tracking-[-0.01em]";

export function DigReading({
  model,
  letters,
}: {
  model: DigModel;
  letters: ReadonlyMap<string, string>;
}) {
  const t = useMessages();
  const r = t.landing.dig.reading;
  return (
    <section
      id="dig-06"
      data-dig-section="plain"
      data-dig-chapter="06"
      aria-labelledby="dig-reading"
      className="scroll-mt-11 border-t-2 border-li-ink"
    >
      <div className={`${CONTAINER} flex flex-col gap-8 pt-11 pb-9`}>
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>06</p>
          <h2
            id="dig-reading"
            className="max-w-[58rem] font-li-display text-[clamp(44px,7vw,76px)] leading-[0.95] font-semibold tracking-[-0.015em] text-balance"
          >
            {r.title}
          </h2>
          <p className="max-w-[34rem] text-[17px] leading-normal text-pretty text-li-neutral-800">
            {r.note}
          </p>
        </div>

        <div className={`relative grid gap-y-9 md:grid-cols-2 md:gap-x-8 xl:gap-x-0 ${WIDE_GRID}`}>
          <span
            aria-hidden
            className={`absolute top-full h-9 border-l border-dashed border-li-gap-ink xl:top-0 xl:-bottom-9 xl:h-auto ${AT_TOKEN}`}
          />
          <div className="contents xl:col-span-2 xl:col-start-1 xl:grid xl:grid-cols-2 xl:gap-x-8">
            <div className={`${COLUMN} border-li-ink`}>
              <p className={META}>{r.reconstructed}</p>
              <p className={FIGURE}>{model.question}</p>
              <ul className="flex flex-col gap-2.5">
                {model.clauses.map((clause) => (
                  <li key={clause.id} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-2 size-2.5 shrink-0 rounded-full border-[1.5px] border-li-ink"
                    />
                    <span className="text-[17px] leading-[1.45]">
                      {clause.text}{" "}
                      <span className="inline-flex gap-0.5 align-[1px]">
                        {clause.citations.map((id) => (
                          <EvidenceLetter
                            key={id}
                            letter={letters.get(id) ?? "?"}
                            variant="cited"
                          />
                        ))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${COLUMN} border-li-evidence`}>
              <p className={`${META} text-li-evidence-ink`}>{r.verified}</p>
              <p className={`${FIGURE} text-li-evidence-ink`}>{r.quotes(model.quoted.length)}</p>
              <ul lang="en" className="flex flex-col gap-2.5">
                {model.quoted.map((quote) => (
                  <li key={quote.letter} className="flex items-baseline gap-2.5">
                    <EvidenceLetter letter={quote.letter} variant="cited" />
                    <span className="text-[17px] leading-[1.45] text-li-neutral-800">
                      “{quote.text}”
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className={`${COLUMN} relative border-dashed border-li-gap-ink md:col-span-2 xl:col-span-1 xl:col-start-4`}
          >
            <span
              aria-hidden
              className="absolute -top-px right-full w-10 border-t border-dashed border-li-gap-ink max-xl:hidden"
            />
            <p className={`${META} text-li-gap-ink`}>{t.landing.demo.notRecorded}</p>
            <p className={`${FIGURE} text-li-gap-ink`}>{r.open}</p>
            <p className="text-[17px] leading-normal text-pretty text-li-neutral-800">
              {r.openBody(longAge(t.time, model.silentDays))}
            </p>
            <span
              aria-hidden
              className="h-3 border border-dashed border-li-ink/35"
              style={{ backgroundImage: DIG_HATCH }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
