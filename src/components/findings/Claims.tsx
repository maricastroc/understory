import type { VerifiedClaim } from "@git-investigator/core/types";

export function Claims({
  claims,
  idToLetter,
}: {
  claims: VerifiedClaim[];
  idToLetter: Map<string, string>;
}) {
  return (
    <p className="max-w-[68ch] text-[16.5px] leading-[1.72] text-[#2a2d36]">
      {claims.map((c, i) => {
        const letters = c.citations
          .map((id) => idToLetter.get(id))
          .filter((l): l is string => Boolean(l));
        const lead = i > 0 ? " " : "";

        if (!c.grounded) {
          return (
            <span key={i}>
              {lead}
              <span className="rounded-[3px] bg-crit-tint px-1 text-crit underline decoration-crit/40 decoration-dotted underline-offset-2">
                {c.text}
              </span>
              <sup className="ml-0.5 text-[10px] font-semibold tracking-wide text-crit uppercase">
                uncited
              </sup>
            </span>
          );
        }

        return (
          <span key={i}>
            {lead}
            {c.text}
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
