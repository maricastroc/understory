"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import type { LineRange } from "../../line-investigation/specimen/types";
import type { LineVersion } from "../demo/strata/types";
import type { ReactNode } from "react";
import { CODE_START, META, RAIL } from "./dig-classes";

const PAST = "bg-li-paper text-strata-bore-ink outline-1 outline-dashed outline-strata-bore-ink";

export function DigVersion({
  version,
  token,
  lane,
}: {
  version: LineVersion;
  token: LineRange | null;
  lane?: ReactNode;
}) {
  const d = useMessages().landing.demo;
  const text = version.text;
  const hit = token !== null && text.length >= token.end;
  const mark = hit ? text.slice(token.start, token.end) : null;
  return (
    <li className="relative">
      {lane}
      <div className={`relative z-10 pb-8 ${RAIL} ${CODE_START}`}>
        <p className={META}>{[d.lineRead, version.note].filter(Boolean).join(" · ")}</p>
        <p
          lang="en"
          className="relative font-li-mono text-[length:var(--code)] leading-10 whitespace-pre text-strata-neutral-700 max-xl:hidden"
        >
          {hit ? (
            <>
              {text.slice(0, token.start)}
              <span className={PAST}>{mark}</span>
              {text.slice(token.end)}
            </>
          ) : (
            <>
              {text}
              <span
                aria-hidden
                className="absolute top-2 left-[calc(var(--col)_*_1ch_-_0.5ch)] h-6 w-[1ch] bg-li-paper outline-1 outline-li-gap outline-dashed"
              />
            </>
          )}
          {version.absent && (
            <span className="absolute left-[calc(var(--col)_*_1ch_+_1.5ch)] font-li-mono text-[12.5px] text-li-gap-ink">
              {version.absent}
            </span>
          )}
        </p>
        <p
          lang="en"
          className="mt-1 font-li-mono text-[15px] leading-7 text-strata-neutral-700 xl:hidden"
        >
          {hit ? (
            <>
              {text.slice(Math.max(0, token.start - 10), token.start)}
              <span className={`px-0.5 ${PAST}`}>{mark}</span>
            </>
          ) : (
            text
          )}
          {version.absent && <span className="text-li-gap-ink"> · {version.absent}</span>}
        </p>
      </div>
    </li>
  );
}
