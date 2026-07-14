"use client";

import { useEffect, useRef, useState } from "react";
import type { DiffResult } from "@git-investigator/core/diff/types";
import { type PrEntry, entryKey } from "./pr-entry";

const STORAGE_KEY = "gi:pr-history";
const MAX_ENTRIES = 10;

function load(): PrEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as PrEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: PrEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    //
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 3)));
    } catch {
      //
    }
  }
}

export function usePrHistory(result: DiffResult | null) {
  const [entries, setEntries] = useState<PrEntry[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const last = useRef<DiffResult | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = load();
    if (saved.length > 0) setEntries(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!result || result === last.current) return;
    last.current = result;
    const key = entryKey(result);
    setEntries((prev) =>
      (prev.some((e) => e.key === key)
        ? prev.map((e) => (e.key === key ? { key, result } : e))
        : [{ key, result }, ...prev]
      ).slice(0, MAX_ENTRIES),
    );
    setActiveKey(key);
  }, [result]);

  useEffect(() => {
    if (!hydrated) return;
    save(entries);
  }, [entries, hydrated]);

  const active = entries.find((e) => e.key === activeKey) ?? null;

  function remove(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setActiveKey((a) => (a === key ? null : a));
  }

  return { entries, activeKey, active, select: setActiveKey, remove, hydrated };
}
