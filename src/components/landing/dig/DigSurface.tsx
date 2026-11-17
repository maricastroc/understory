"use client";

import type { ReactNode } from "react";
import { useMessages } from "@/i18n/LocaleProvider";
import { CONTAINER } from "../parts/landing-classes";
import type { BlameLine } from "./blame-line";
import { META, TOKEN } from "./dig-classes";
import type { DigModel } from "./types";

export function Found({
  label,
  drop,
  children,
}: {
  label: string;
  drop: string;
  children: ReactNode;
}) {
  return (
    <span className="relative">
      {children}
      <span
        className={`absolute inset-x-0 border-t border-li-evidence pt-1 font-li-mono text-xs leading-none text-li-evidence-ink ${drop}`}
      >
        {label} ✓
      </span>
    </span>
  );
}

export function CodeLine({ model }: { model: DigModel }) {
  const { code, token } = model;
  if (!token) return <>{code}</>;
  return (
    <>
      {code.slice(0, token.start)}
      <span className={TOKEN}>{code.slice(token.start, token.end)}</span>
      {code.slice(token.end)}
    </>
  );
}

export function DigSurface({ model, blame }: { model: DigModel; blame: BlameLine }) {
  const h = useMessages().landing.hero;
  return (
    <>
      <div className={`${CONTAINER} pt-9 max-xl:hidden`}>
        <p className={META}>$ {blame.command}</p>
        <p
          lang="en"
          className="mt-2 font-li-mono text-[length:var(--code)] leading-14 whitespace-pre text-li-ink"
        >
          <span className="text-li-neutral-700">{blame.open}</span>
          <Found label={h.who} drop="top-[calc(100%_+_1.75rem)]">
            {blame.author}
          </Found>{" "}
          <Found label={h.when} drop="top-[calc(100%_+_1.75rem)]">
            {blame.day}
          </Found>
          <span className="text-li-neutral-700">{blame.close}</span>
          <span className="-mx-3 inline-block bg-li-datum-row px-3">
            <CodeLine model={model} />
          </span>
        </p>
      </div>
      <div className="pt-6 xl:hidden">
        <p className={`${CONTAINER} ${META}`}>$ {blame.command}</p>
        <p
          lang="en"
          className="mt-2 bg-li-datum-row pl-[calc(var(--gutter)_+_12px)] font-li-mono text-[length:var(--code)] leading-11 whitespace-pre text-li-ink"
        >
          <CodeLine model={model} />
        </p>
      </div>
      <div aria-hidden className="h-[3px] bg-li-datum" />
    </>
  );
}
