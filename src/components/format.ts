import type { Artifact, ArtifactRef, Confidence } from "@understory/core/types";

export const letter = (i: number) => String.fromCharCode(65 + i);

export function toArtifactRef(a: Artifact): ArtifactRef {
  const n = a.ref?.startsWith("#") ? Number(a.ref.slice(1)) : NaN;
  const sha = typeof a.meta?.sha === "string" ? a.meta.sha : undefined;
  return {
    kind: a.kind,
    id: a.id,
    ref: a.ref,
    title: a.title,
    number: Number.isFinite(n) ? n : undefined,
    oid: sha ?? (a.kind === "commit" ? a.ref : undefined),
  };
}

export function basename(p: string): string {
  return p.split("/").filter(Boolean).pop() ?? p;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export const levelTone: Record<Confidence["level"], { text: string; bg: string; ring: string }> = {
  high: { text: "text-good", bg: "bg-good-tint", ring: "var(--color-good)" },
  medium: { text: "text-warn", bg: "bg-warn-tint", ring: "var(--color-warn)" },
  low: { text: "text-crit", bg: "bg-crit-tint", ring: "var(--color-crit)" },
};
