"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { BlueprintCorners } from "../line-investigation/parts/BlueprintCorners";
import { Elapsed } from "../line-investigation/parts/Elapsed";
import { PendingMark } from "../line-investigation/parts/PendingMark";

export function LoadingCard() {
  const m = useMessages();
  return (
    <div
      role="status"
      className="relative border border-li-divider bg-li-neutral-100 p-6 font-li-body text-li-ink"
    >
      <BlueprintCorners />
      <div className="flex items-center gap-3">
        <PendingMark className="text-li-neutral-600" />
        <span className="text-sm font-semibold">{m.loading.investigating}</span>
        <Elapsed />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-li-text-subtle">
        {m.loading.stages.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>→</span>}
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
