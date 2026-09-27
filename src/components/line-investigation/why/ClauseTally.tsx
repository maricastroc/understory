import type { ReactNode } from "react";
import { tallyText } from "../copy/clause-copy";
import type { ViewClause } from "../model/types";
import { TallyCells } from "./TallyCells";

const LAYOUT = {
  column: "flex-col items-end pt-0.75",
  below: "mt-1 flex-row items-center gap-2",
  inline: "flex-row items-center gap-2",
} as const;

export function ClauseTally({
  clause,
  layout,
  custom,
}: {
  clause: ViewClause;
  layout: keyof typeof LAYOUT;
  custom?: { cells: ReactNode; label: string };
}) {
  return (
    <span aria-hidden className={`flex gap-0.75 ${LAYOUT[layout]}`}>
      {custom ? custom.cells : <TallyCells clause={clause} />}
      <span
        className={`text-[11.5px] whitespace-nowrap ${clause.silent ? "text-li-gap-ink" : "text-li-neutral-800"}`}
      >
        {custom ? custom.label : tallyText(clause)}
      </span>
    </span>
  );
}
