"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { answerLanguageOf } from "@/i18n/locales";

export type Language = "en" | "pt";

const KEY = "gi:lang";
const listeners = new Set<() => void>();

const parse = (value: string | null): Language | null =>
  value === "en" || value === "pt" ? value : null;

export function readExplicitLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  return parse(localStorage.getItem(KEY));
}

function write(next: Language) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, next);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLanguage() {
  const locale = useLocale();
  const explicit = useSyncExternalStore(subscribe, readExplicitLanguage, () => null);
  return { language: explicit ?? answerLanguageOf(locale), explicit, setLanguage: write };
}
