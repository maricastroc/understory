"use client";

import Link from "next/link";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { shortAge } from "@/i18n/format";
import { BlueprintCorners } from "../../line-investigation/parts/BlueprintCorners";
import { liButton } from "../../line-investigation/parts/button-class";
import { askedText } from "../../line-investigation/copy/asked-copy";
import { META, ON_BORE, RAIL, WIDE_GRID } from "./dig-classes";
import { DigSection } from "./DigSection";
import { Found } from "./DigSurface";
import type { BlameLine, DigModel } from "./types";

function Question({ model }: { model: DigModel }) {
  const locale = useLocale();
  const mark = model.token ? model.code.slice(model.token.start, model.token.end) : null;
  const at = mark ? model.question.indexOf(mark) : -1;
  return (
    <div className="flex flex-col gap-1">
      <p className="font-li-mono text-xs text-strata-bore-ink">
        {askedText(mark, model.line, locale)}
      </p>
      <p className="font-li-display text-[34px] leading-none font-semibold tracking-[-0.01em]">
        {mark && at >= 0 ? (
          <>
            {model.question.slice(0, at)}
            <span className="text-li-brand">{mark}</span>
            {model.question.slice(at + mark.length)}
          </>
        ) : (
          model.question
        )}
      </p>
    </div>
  );
}

export function BreakMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      width="18"
      height="14"
      viewBox="0 0 18 14"
      className={`bg-li-paper text-li-ink ${className}`}
    >
      <path d="M2 11 L16 7 M2 7 L16 3" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function DigHero({ model, blame }: { model: DigModel; blame: BlameLine }) {
  const t = useMessages();
  const l = t.landing;
  return (
    <DigSection id="dig-01" chapter="01" labelledBy="dig-title">
      <span aria-hidden className={`${ON_BORE} top-0 z-[1] h-4 w-2.5 bg-li-paper xl:hidden`} />
      <span
        aria-hidden
        className="absolute top-0 left-[calc(var(--bore-x)_-_1px)] z-[2] h-4.5 w-[calc(13px_+_var(--code)_*_0.6_*_var(--col)_-_var(--bore-x))] border-r-2 border-b-2 border-li-ink xl:hidden"
      />
      <p className="absolute top-1.5 left-[calc(24px_+_var(--code)_*_0.6_*_var(--col))] border border-dashed border-li-gap-ink bg-li-paper px-1.5 font-li-mono text-xs leading-5 text-li-gap-ink xl:top-3 xl:left-[calc(var(--bore-x)_+_0.9rem)] xl:px-2">
        {l.hero.why} ∅<span className="max-xl:hidden"> · {l.dig.whyMissing}</span>
      </p>

      <div className={`${RAIL} ${WIDE_GRID} pt-9 pb-4 xl:pt-[4.5rem] xl:pb-5`}>
        <p className={`${META} text-strata-bore-ink max-xl:hidden xl:absolute xl:top-3 xl:left-0`}>
          {l.dig.today}
          <br />
          ±0
        </p>
        <h1
          id="dig-title"
          className="font-li-display text-[clamp(60px,20vw,128px)] leading-[0.88] font-semibold tracking-[-0.015em] text-li-ink xl:col-span-2 xl:col-start-1 xl:row-start-1 xl:text-[clamp(120px,21.5vh,184px)] xl:[html[lang=pt-BR]_&]:max-w-[5.6em] xl:[html[lang=pt-BR]_&]:text-[clamp(100px,17.5vh,130px)]"
        >
          {l.hero.title}{" "}
          <span className="underline decoration-li-datum decoration-[0.06em] underline-offset-[0.1em]">
            {l.hero.titleMark}
          </span>
        </h1>
        <div className="mt-8 flex max-w-[36rem] flex-col gap-7 md:grid md:max-w-none md:grid-cols-2 md:items-start md:gap-x-12 xl:col-start-4 xl:row-start-1 xl:-mt-5 xl:flex xl:gap-6">
          <p
            lang="en"
            className="pb-6 font-li-mono text-[13px] leading-6 whitespace-pre text-li-ink md:col-span-2 xl:hidden"
          >
            <span className="text-li-neutral-700">{blame.ref} </span>
            <Found label={l.hero.who} drop="top-[calc(100%_+_0.125rem)]">
              {blame.author}
            </Found>{" "}
            <Found label={l.hero.when} drop="top-[calc(100%_+_0.125rem)]">
              {blame.day}
            </Found>
          </p>
          <div className="flex flex-col gap-6">
            <p className="text-[21px] leading-[1.42] text-pretty text-li-ink">{l.hero.lead}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/app" className={liButton("primary", "", "lg")}>
                <BlueprintCorners />
                {l.explainGo}
              </Link>
              <a href="#dig-02" className="li-link py-2.5 text-[15px] font-medium">
                {l.dig.digGo} ↓
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-li-divider pt-6 md:border-t-0 md:pt-0 xl:border-t xl:pt-6">
            <Question model={model} />
            <div className="flex flex-col">
              <p className={`${META} pb-1`}>{l.dig.answer(0, model.clauses.length)}</p>
              {model.clauses.map((c) => (
                <span key={c.id} className="flex h-5 items-center gap-2.5">
                  <span className="size-2.5 rounded-full border border-dashed border-li-neutral-700" />
                  <span className="flex-1 border-t border-dashed border-li-ink/40" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`relative flex min-h-14 items-center py-3 ${RAIL} ${WIDE_GRID}`}>
        <BreakMark className={`${ON_BORE} top-1/2 -translate-y-1/2`} />
        <p
          className={`${META} flex flex-col gap-x-8 gap-y-1 xl:col-start-2 xl:flex-row xl:justify-between xl:pr-10`}
        >
          <span>↓ {l.dig.cue}</span>
          <span>{l.dig.unchanged(shortAge(t.time, model.unchangedDays), model.line)}</span>
        </p>
      </div>
    </DigSection>
  );
}
