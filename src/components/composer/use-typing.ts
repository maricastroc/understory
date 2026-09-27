"use client";

import { useEffect, useState } from "react";

const QUIET_MS = 700;

export function useTyping(value: string): boolean {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), QUIET_MS);
    return () => clearTimeout(t);
  }, [value]);
  return settled !== value;
}
