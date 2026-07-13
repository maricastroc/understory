"use client";

import { useEffect, useRef, useState } from "react";
import type { DiffResult } from "@git-investigator/core/diff/types";
import { type PrEntry, entryKey } from "./pr-entry";

export function usePrHistory(result: DiffResult | null) {
  const [entries, setEntries] = useState<PrEntry[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const last = useRef<DiffResult | null>(null);

  useEffect(() => {
    if (!result || result === last.current) return;
    last.current = result;
    const key = entryKey(result);
    setEntries((prev) =>
      prev.some((e) => e.key === key)
        ? prev.map((e) => (e.key === key ? { key, result } : e))
        : [{ key, result }, ...prev],
    );
    setActiveKey(key);
  }, [result]);

  const active = entries.find((e) => e.key === activeKey) ?? null;

  function remove(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setActiveKey((a) => (a === key ? null : a));
  }

  return { entries, activeKey, active, select: setActiveKey, remove };
}
