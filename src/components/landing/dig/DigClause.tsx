"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { EvidenceLetter } from "../../line-investigation/parts/EvidenceLetter";
import type { ViewClause } from "../../line-investigation/model/types";
import { DRAW, META, WIPE } from "./dig-classes";
import { useReached } from "./dig-context";

function Letter({ id, letter }: { id: string; letter: string }) {
  return <EvidenceLetter letter={letter} variant={useReached(id) ? "cited" : "unverified"} />;
}

export function DigClause({
  clause,
  letters,
  order,
  total,
  verified = false,
  tally,
  id,
  className = "",
}: {
  clause: ViewClause;
  letters: ReadonlyMap<string, string>;
  order: number;
  total: number;
  verified?: boolean;
  tally?: string;
  id: string;
  className?: string;
}) {
  const t = useMessages().landing.dig;
  return (
    <div
      data-dig-item
      data-dig-id={id}
      data-dig-offset="72"
      className={`group/row relative pb-7 xl:col-start-4 xl:row-start-1 xl:pb-0 ${className}`}
    >
      <span
        aria-hidden
        className={`absolute top-3.5 right-full w-10 -translate-y-1/2 max-xl:hidden ${
          verified ? "h-0.5 bg-li-evidence" : "h-px bg-li-ink/50"
        } ${DRAW}`}
      />
      <div
        className={`flex flex-col gap-1 border-l-2 pl-3 delay-150 xl:border-l-0 xl:pl-0 ${
          verified ? "border-li-evidence" : "border-li-ink"
        } ${WIPE}`}
      >
        <p className={`${META} xl:hidden`}>{t.answer(order, total)}</p>
        <p className="flex gap-2.5">
          <span
            aria-hidden
            className={`mt-2 size-2.5 shrink-0 rounded-full max-xl:hidden ${
              verified ? "bg-li-evidence" : "border-[1.5px] border-li-ink bg-li-paper"
            }`}
          />
          <span className={`text-lg leading-[1.45] ${verified ? "font-semibold" : "font-medium"}`}>
            {clause.text}{" "}
            <span className="inline-flex gap-0.5 align-[1px]">
              {clause.citations.map((id) => (
                <Letter key={id} id={id} letter={letters.get(id) ?? "?"} />
              ))}
            </span>
          </span>
        </p>
        {tally && <p className={`${META} text-li-evidence-ink xl:pl-5`}>{tally}</p>}
      </div>
    </div>
  );
}
