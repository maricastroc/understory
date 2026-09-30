"use client";

import { useSyncExternalStore } from "react";

export type Language = "en" | "pt";

const KEY = "gi:lang";
const listeners = new Set<() => void>();
let current: Language | null = null;

export function readLanguage(): Language {
  if (current !== null) return current;
  if (typeof window === "undefined") return "en";
  current = localStorage.getItem(KEY) === "pt" ? "pt" : "en";
  return current;
}

function write(next: Language) {
  current = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, next);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = e.newValue === "pt" ? "pt" : "en";
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, readLanguage, () => "en" as Language);
  return { language, setLanguage: write };
}
