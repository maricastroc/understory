import type { Confidence } from "@/lib/types";

/** 0 -> "A", 1 -> "B" … for exhibit labels. */
export const letter = (i: number) => String.fromCharCode(65 + i);

/** "a/b/payments-service" -> "payments-service". */
export function basename(p: string): string {
  return p.split("/").filter(Boolean).pop() ?? p;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO 8601 -> "27 Nov 2023". */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** 1500 -> "1.5k", 23000 -> "23k", 2_400_000 -> "2.4m". */
export function fmtCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
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
