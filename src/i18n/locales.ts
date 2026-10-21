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

export function localeFrom(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
