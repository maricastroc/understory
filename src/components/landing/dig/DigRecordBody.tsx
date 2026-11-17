"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { displayId, labelTitle } from "../../line-investigation/copy/artifact-copy";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import { META } from "./dig-classes";
import type { DigRecord } from "./types";

type Weight = "lead" | "plain" | "minor";

const TITLE: Record<Weight, string> = {
  lead: "text-[22px] leading-7 font-medium text-li-ink",
  plain: "text-xl leading-7 text-li-ink",
  minor: "text-[17px] leading-6 text-li-neutral-800",
};

const EXCERPT: Record<Weight, string> = {
  lead: "text-lg leading-[1.55] text-li-neutral-800",
  plain: "text-[17px] leading-[1.55] text-li-neutral-800",
  minor: "text-[15px] leading-normal text-li-neutral-700",
};

export function DigExcerpt({
  text,
  quote,
  weight = "plain",
}: {
  text: string;
  quote: string | null;
  weight?: Weight;
}) {
  const at = quote ? text.indexOf(quote) : -1;
  return (
    <p lang="en" className={`max-w-[35rem] text-pretty ${EXCERPT[weight]}`}>
      “
      {quote && at >= 0 ? (
        <>
          {text.slice(0, at)}
          <span className="text-li-evidence-ink underline decoration-li-evidence decoration-2 underline-offset-4">
            {quote}
          </span>
          {text.slice(at + quote.length)}
        </>
      ) : (
        text
      )}
      ”
    </p>
  );
}

export function DigRecordBody({
  record,
  weight = "plain",
  meta,
  chip,
  children,
}: {
  record: DigRecord;
  weight?: Weight;
  meta?: string;
  chip?: ReactNode;
  children?: ReactNode;
}) {
  const locale = useLocale();
  const a = record.artifact;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <EvidenceLetter letter={a.letter} variant={a.role === "cited" ? "cited" : "supporting"} />
        <span className="font-li-mono text-sm font-medium text-li-ink">{displayId(a)}</span>
        <span className={TITLE[weight]}>{labelTitle(a, locale)}</span>
        {chip}
        {meta && <span className={META}>{meta}</span>}
      </p>
      {children ??
        (record.excerpt && (
          <DigExcerpt text={record.excerpt} quote={record.quote?.text ?? null} weight={weight} />
        ))}
    </div>
  );
}
