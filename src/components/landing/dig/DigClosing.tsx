"use client";

import Link from "next/link";
import { useMessages } from "@/i18n/LocaleProvider";
import { BlueprintCorners } from "../../line-investigation/parts/BlueprintCorners";
import { liButton } from "../../line-investigation/parts/button-class";
import { CONTAINER } from "../parts/landing-classes";
import { AT_TOKEN, CODE_START, META, TOKEN, WIDE_GRID } from "./dig-classes";
import { ArrowRight } from "@/components/icons";

export function DigClosing() {
  const t = useMessages().landing;
  return (
    <section aria-labelledby="dig-closing">
      <div aria-hidden className={CONTAINER}>
        <div className="relative h-7">
          <span
            className={`absolute top-0 -bottom-3 z-10 border-l border-dashed border-li-gap-ink xl:-bottom-4 ${AT_TOKEN}`}
          />
        </div>
      </div>
      <div aria-hidden className={CONTAINER}>
        <div className="relative">
          <p
            className={`relative w-fit bg-li-datum-row pr-[calc(var(--col)_*_var(--code)_*_0.6_+_1.5rem)] pl-3 font-li-mono text-[length:var(--code)] leading-11 whitespace-pre text-li-neutral-700 xl:leading-14 ${CODE_START} xl:-translate-x-3`}
          >
            <span className="absolute inset-y-0 left-3 flex items-center">
              {t.dig.closing.line}
            </span>{" "}
          </p>
          <span
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-[0.35ch] font-li-mono text-[length:var(--code)] leading-[1.4] text-li-ink ${AT_TOKEN} ${TOKEN}`}
          >
            ?
          </span>
        </div>
      </div>
      <div aria-hidden className="h-[3px] bg-li-datum" />
      <div className={CONTAINER}>
        <div className={`relative pt-20 pb-12 xl:pt-9 ${WIDE_GRID}`}>
          <span
            aria-hidden
            className={`absolute top-0 h-11 -translate-x-1/2 border-l-2 border-dashed border-li-ink xl:bottom-12 xl:h-auto ${AT_TOKEN}`}
          />
          <span
            aria-hidden
            className={`absolute top-11 size-2.5 -translate-x-1/2 rounded-full border-[1.5px] border-li-ink bg-li-paper xl:top-auto xl:bottom-[2.4rem] ${AT_TOKEN}`}
          />
          <p
            aria-hidden
            className={`${META} absolute top-8 right-[calc(100%_-_var(--col)_*_var(--code)_*_0.6)] whitespace-nowrap xl:top-auto xl:right-auto xl:bottom-3 xl:left-[calc(var(--bore-x)_+_1rem)]`}
          >
            {t.dig.closing.depth}
          </p>
          <h2
            id="dig-closing"
            className="font-li-display text-[clamp(48px,13vw,92px)] leading-[0.92] font-semibold tracking-[-0.015em] text-balance xl:col-span-2 xl:col-start-1 xl:row-start-1 xl:pr-10"
          >
            {t.closing.title}
          </h2>
          <div className="mt-6 flex flex-col items-start gap-5 xl:col-start-4 xl:row-start-1 xl:mt-1">
            <p className="text-lg text-pretty text-li-neutral-800">{t.closing.body}</p>
            <Link href="/app" className={liButton("primary", "", "xl")}>
              <BlueprintCorners />
              {t.explain}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
