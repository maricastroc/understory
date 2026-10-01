"use client";

import type { NarrativeLanguage } from "@understory/core/types";
import { useId, useSyncExternalStore } from "react";
import { SEGMENT_GROUP, segmentClass } from "./segment-class";

export const LANGUAGE_NAME: Record<NarrativeLanguage, string> = {
  en: "English",
  pt: "Portuguese",
};

const noop = () => () => {};

export function LanguageSwitch({
  label,
  language,
  onChange,
}: {
  label: string;
  language: NarrativeLanguage;
  onChange: (l: NarrativeLanguage) => void;
}) {
  const id = useId();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span id={id} className="text-xs text-li-text-subtle">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className={`${SEGMENT_GROUP} h-6 grid-cols-2 text-[11px]`}
      >
        {(["en", "pt"] as const).map((l) => {
          const active = mounted && language === l;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(l)}
              className={`min-w-7 px-1.5 ${segmentClass(active)}`}
            >
              {l.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
