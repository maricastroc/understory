"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatSeconds } from "@/i18n/format";
import { useElapsed } from "./use-elapsed";

export function Elapsed({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const seconds = useElapsed();
  if (seconds < 1) return null;
  return (
    <span aria-hidden className={`font-li-mono text-[11px] text-li-text-subtle tnum ${className}`}>
      · {formatSeconds(locale, seconds)}
    </span>
  );
}
