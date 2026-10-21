import type { NarrativeLanguage } from "@understory/core/types";

export const LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "understory-locale";

export const LOCALE_NAME: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português",
};

const ANSWER_LANGUAGE: Record<Locale, NarrativeLanguage> = {
  en: "en",
  "pt-BR": "pt",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function answerLanguageOf(locale: Locale): NarrativeLanguage {
  return ANSWER_LANGUAGE[locale];
}

export function offeredLocales(env: Record<string, string | undefined>): Locale[] {
  if (env.NODE_ENV !== "production" || env.UNDERSTORY_PT_BR === "1") return [...LOCALES];
  return [DEFAULT_LOCALE];
}

export function localeFrom(value: string | undefined, offered: readonly Locale[]): Locale {
  return isLocale(value) && offered.includes(value) ? value : DEFAULT_LOCALE;
}
