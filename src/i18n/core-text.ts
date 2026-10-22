import type { Locale } from "./locales";

type CoreTexts = { fileLevelNote: string };

const TRANSLATED: Record<Exclude<Locale, "en">, CoreTexts> = {
  "pt-BR": {
    fileLevelNote:
      "O blame do provedor não trouxe o histórico desta linha, então aparecem os commits recentes que mexeram no arquivo. Um clone local traz o histórico completo da linha.",
  },
};

export function coreText(locale: Locale, key: keyof CoreTexts, original: string): string {
  return locale === "en" ? original : TRANSLATED[locale][key];
}
