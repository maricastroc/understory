"use client";

import { createContext, useContext, useEffect, useState } from "react";

const Seen = createContext<Set<string> | null>(null);

export const FirstSightProvider = Seen.Provider;

export function useFirstSight(key: string | null): boolean {
  const seen = useContext(Seen);
  const [first] = useState(() => !!key && !!seen && !seen.has(key));
  useEffect(() => {
    if (key) seen?.add(key);
  }, [key, seen]);
  return first;
}
