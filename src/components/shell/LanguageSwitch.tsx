"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "../use-language";

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
      className="grid shrink-0 grid-cols-2 overflow-hidden rounded border border-li-divider text-xs"
    >
      {(["en", "pt"] as const).map((l) => {
        const active = mounted && language === l;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l)}
            className={`cursor-pointer px-2 py-1.25 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-steel ${
              active ? "bg-li-ink text-li-paper" : "text-li-text-subtle hover:bg-li-neutral-200"
            }`}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
