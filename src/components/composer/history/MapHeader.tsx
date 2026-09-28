"use client";

import { useId, useState } from "react";
import { liButton } from "../../line-investigation/parts/button-class";

export function MapHeader({
  titleId,
  scope,
  about,
  mapped,
  moreLabel,
  onMapMore,
}: {
  titleId: string;
  scope: string;
  about: string[];
  mapped: string | null;
  moreLabel: string | null;
  onMapMore: (() => void) | null;
}) {
  const aboutId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t border-li-rule pt-3">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-[13.5px] text-li-neutral-800">
        <h2 id={titleId} className="text-[15px] font-semibold text-li-ink">
          History of current lines
        </h2>
        <p>{scope}</p>
        <button
          type="button"
          aria-label="About this map"
          aria-expanded={open}
          aria-controls={aboutId}
          onClick={() => setOpen((v) => !v)}
          className="group -my-1 grid size-6 cursor-pointer place-items-center self-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-li-focus"
        >
          <span
            aria-hidden
            className={`grid size-4 place-items-center rounded-full border font-li-mono text-[10px] leading-none font-medium transition-colors motion-reduce:transition-none ${
              open
                ? "border-li-ink bg-li-ink text-li-paper"
                : "border-li-neutral-500 text-li-neutral-800 group-hover:border-li-ink group-hover:text-li-ink"
            }`}
          >
            i
          </span>
        </button>
        {mapped && (
          <span className="ml-auto font-li-mono text-[12px] text-li-neutral-800">{mapped}</span>
        )}
        {moreLabel && (
          <button
            type="button"
            onClick={onMapMore ?? undefined}
            disabled={!onMapMore}
            className={liButton("ghost", mapped ? "" : "ml-auto", "sm")}
          >
            {moreLabel}
          </button>
        )}
      </div>
      <div
        id={aboutId}
        hidden={!open}
        className="flex max-w-[76ch] flex-col gap-1 text-[12.5px] leading-relaxed text-li-neutral-800"
      >
        {about.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
