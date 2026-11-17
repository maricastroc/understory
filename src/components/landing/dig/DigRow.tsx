import type { ArtifactKind } from "@understory/core/types";
import type { ReactNode } from "react";
import { ON_BORE, POP, ROW } from "./dig-classes";

const NODE: Record<ArtifactKind, string> = {
  commit: "size-2.5 rounded-full border-[1.5px] border-li-ink bg-li-paper",
  pull_request: "size-2.5 border-[1.5px] border-li-ink bg-li-paper",
  review: "h-[1.5px] w-3 bg-li-ink",
  issue: "size-3 rotate-45 bg-li-evidence",
};

export function DigRow({
  id,
  depth,
  kind,
  date,
  aside,
  lane,
  node = "top-8 xl:top-3.5",
  offset,
  className = "",
  children,
}: {
  id: string;
  depth: string;
  kind: ArtifactKind;
  date: ReactNode;
  aside?: ReactNode;
  lane?: ReactNode;
  node?: string;
  offset?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      data-dig-item
      data-dig-id={id}
      data-dig-depth={depth}
      data-dig-offset={offset}
      className={`${ROW} ${className}`}
    >
      {lane}
      <span
        aria-hidden
        className={`${ON_BORE} ${node} flex -translate-y-1/2 items-center justify-center`}
      >
        <span className={`${NODE[kind]} ${POP}`} />
      </span>
      <p
        className={`font-li-mono text-[12.5px] leading-5 text-li-neutral-700 xl:col-start-1 xl:row-start-1 xl:pt-1`}
      >
        {date}
      </p>
      <div className={`xl:col-start-2 xl:row-start-1 ${aside ? "pb-4 xl:pb-7" : "pb-7"}`}>
        {children}
      </div>
      {aside}
    </li>
  );
}
