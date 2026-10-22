"use client";

import type { VerifiedClaim } from "@understory/core/types";
import { useMessages } from "@/i18n/LocaleProvider";

export function Claims({
  claims,
  idToLetter,
  language,
}: {
  claims: VerifiedClaim[];
  idToLetter: Map<string, string>;
  language?: string;
}) {
  const uncited = useMessages().report.findings.uncited;
  return (
    <p className="max-w-[68ch] text-[16.5px] leading-[1.72] text-ink-body">
      {claims.map((c, i) => {
        const letters = c.citations
          .map((id) => idToLetter.get(id))
          .filter((l): l is string => Boolean(l));
        const lead = i > 0 ? " " : "";

        if (!c.grounded) {
          return (
            <span key={i}>
              {lead}
              <span
                lang={language}
                className="rounded-[3px] bg-crit-tint px-1 text-crit underline decoration-crit/40 decoration-dotted underline-offset-2"
              >
                {c.text}
              </span>
              <sup className="ml-0.5 text-[10px] font-semibold tracking-wide text-crit uppercase">
                {uncited}
              </sup>
            </span>
          );
        }

        return (
          <span key={i}>
            {lead}
            <span lang={language}>{c.text}</span>
            {letters.length > 0 && (
              <sup className="ml-0.5 text-[10.5px] font-semibold text-accent-press">
                {letters.join(",")}
              </sup>
            )}
          </span>
        );
      })}
    </p>
  );
}
