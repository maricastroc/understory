"use client";

import { useSyncExternalStore } from "react";
import { SPECIMEN } from "./specimen-metrics";
import type { SpecimenLayout } from "./types";

export const SPECIMEN_LAYOUTS = {
  wide: { mode: "panel", width: "wide", context: 0 },
  narrow: { mode: "panel", width: "narrow", context: 0 },
  strip: { mode: "strip", width: "full", context: SPECIMEN.stripContext },
  compact: { mode: "strip", width: "full", context: SPECIMEN.compactContext },
} as const satisfies Record<string, SpecimenLayout>;

const QUERIES = [
  ["wide", "(min-width: 1360px)"],
  ["narrow", "(min-width: 1100px)"],
  ["strip", "(min-width: 820px)"],
] as const;

function read(): SpecimenLayout {
  if (typeof window === "undefined" || !window.matchMedia) return SPECIMEN_LAYOUTS.wide;
  for (const [key, query] of QUERIES) {
    if (window.matchMedia(query).matches) return SPECIMEN_LAYOUTS[key];
  }
  return SPECIMEN_LAYOUTS.compact;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const lists = QUERIES.map(([, q]) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

export function useSpecimenLayout(): SpecimenLayout {
  return useSyncExternalStore(subscribe, read, () => SPECIMEN_LAYOUTS.wide);
}
