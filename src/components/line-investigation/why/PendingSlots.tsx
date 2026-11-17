"use client";

import { Elapsed } from "../parts/Elapsed";
import { PendingMark } from "../parts/PendingMark";

const WIDTHS = [0.9, 0.62, 0.78];

export function PendingSlots({ caption }: { caption: string }) {
  return (
    <div role="status" className="mt-1 flex flex-col gap-1.5">
      <p className="flex flex-wrap items-baseline gap-x-1.5 pl-7 text-xs text-li-text-subtle">
        {caption}
        <Elapsed />
      </p>
      <ul aria-hidden className="flex flex-col">
        {WIDTHS.map((w) => (
          <li key={w} className="flex h-12.5 items-start gap-3.5 pt-2">
            <PendingMark className="mt-px ml-1 text-li-neutral-600" />
            <span
              className="mt-1.5 border-t border-dashed border-li-ink/40"
              style={{ width: `${w * 100}%` }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
