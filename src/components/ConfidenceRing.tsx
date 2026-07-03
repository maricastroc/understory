import type { Confidence } from "@/lib/types";
import { levelLabel, levelTone } from "./format";

export function ConfidenceRing({
  confidence,
  size = 132,
}: {
  confidence: Confidence;
  size?: number;
}) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, confidence.score));
  const dash = pct * circumference;
  const tone = levelTone[confidence.level];
  const showLabel = size >= 92;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--color-inset)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={tone.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* font scales with `size` so the percentage never overflows a small ring */}
        <span
          className="leading-none font-bold tracking-tight tnum"
          style={{ fontSize: Math.round(size * 0.26) }}
        >
          {Math.round(pct * 100)}%
        </span>
        {showLabel && (
          <span
            className={`mt-1 font-semibold tracking-wider uppercase ${tone.text}`}
            style={{ fontSize: Math.round(size * 0.08) }}
          >
            {levelLabel[confidence.level]}
          </span>
        )}
      </div>
    </div>
  );
}
