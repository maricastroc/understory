"use client";

import { createContext, useContext } from "react";

const DigReached = createContext<ReadonlySet<string> | null>(null);

export const DigReachedProvider = DigReached;

export function useReached(id: string): boolean {
  const reached = useContext(DigReached);
  return reached === null || reached.has(id);
}
