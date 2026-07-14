"use client";

import { useSyncExternalStore } from "react";
import { Languages } from "./icons";
import type { Language } from "./use-language";

const LABELS: Record<Language, string> = { en: "EN", pt: "PT" };

const noop = () => () => {};

export function LangToggle({
  language,
  onChange,
  className = "h-9",
}: {
  language: Language;
  onChange: (l: Language) => void;
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <div
      role="group"
      aria-label="Language of the analysis"
      title="Language the analysis is written in"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line-2 bg-surface px-1 ${className}`}
    >
      <Languages className="ml-0.5 size-3.5 shrink-0 text-ink-3" />
      {(["en", "pt"] as const).map((l) => {
        const active = mounted && language === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={`rounded px-1.5 py-1 text-[12px] font-semibold transition-colors ${
              active ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
