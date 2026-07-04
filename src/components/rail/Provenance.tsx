import type { VerifiedNarrative } from "@/lib/types";

export function Provenance({ narrative }: { narrative: VerifiedNarrative }) {
  const c = narrative.confidence;
  const denom = Math.max(1, c.primarySources + c.corroborating + c.contradicting);
  const pct = (n: number) => `${Math.max(n > 0 ? 6 : 2, Math.round((n / denom) * 100))}%`;
  const bars: Array<{ label: string; n: number; color: string }> = [
    { label: "Primary sources", n: c.primarySources, color: "var(--color-good)" },
    { label: "Corroborating", n: c.corroborating, color: "var(--color-accent)" },
    { label: "Contradicting", n: c.contradicting, color: "var(--color-crit)" },
  ];

  return (
    <>
      <div
        className={`text-[15px] font-semibold ${narrative.grounded ? "text-good" : "text-crit"}`}
      >
        {narrative.grounded
          ? "All citations grounded"
          : `${narrative.unknownCitations.length} fabricated citation${narrative.unknownCitations.length > 1 ? "s" : ""}`}
      </div>
      <div className="mt-1 text-[12px] leading-snug text-ink-2">
        {narrative.grounded
          ? "Every cited source resolves to a real, collected artifact. 0 unverified citations."
          : "A cited source was not found in the collected evidence — verification caught it."}
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-2 rounded-[2px]" style={{ background: b.color }} />
                {b.label}
              </span>
              <span className="font-semibold tnum">{b.n}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-inset">
              <span
                className="block h-full rounded-full"
                style={{ width: pct(b.n), background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
