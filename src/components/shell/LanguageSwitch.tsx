"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "../use-language";
import { SEGMENT_GROUP, segmentClass } from "./segment-class";

const noop = () => () => {};

export function LanguageSwitch({
  language,
  onChange,
}: {
  language: Language;
  onChange: (l: Language) => void;
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
      className={`${SEGMENT_GROUP} h-8 grid-cols-2 text-xs`}
    >
      {(["en", "pt"] as const).map((l) => {
        const active = mounted && language === l;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l)}
            className={`px-2 ${segmentClass(active)}`}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
