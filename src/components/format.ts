import type { Confidence } from "@/lib/types";

/** 0 -> "A", 1 -> "B" … for exhibit labels. */
export const letter = (i: number) => String.fromCharCode(65 + i);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO 8601 -> "27 Nov 2023". */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export const levelLabel: Record<Confidence["level"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Tailwind text/border/bg trio keyed by confidence level. */
export const levelTone: Record<Confidence["level"], { text: string; bg: string; ring: string }> = {
  high: { text: "text-good", bg: "bg-good-tint", ring: "var(--color-good)" },
  medium: { text: "text-warn", bg: "bg-warn-tint", ring: "var(--color-warn)" },
  low: { text: "text-crit", bg: "bg-crit-tint", ring: "var(--color-crit)" },
};
