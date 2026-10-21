import { en } from "./en";
import type { Locale } from "./locales";
import { ptBR } from "./pt-BR";

export type Messages = typeof en;

const MESSAGES: Record<Locale, Messages> = {
  en,
  "pt-BR": ptBR,
};

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
