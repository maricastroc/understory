"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { type Messages, messagesFor } from "./messages";

type LocaleState = { locale: Locale; offered: readonly Locale[] };

const LocaleContext = createContext<LocaleState>({
  locale: DEFAULT_LOCALE,
  offered: [DEFAULT_LOCALE],
});

export function LocaleProvider({
  locale,
  offered,
  children,
}: {
  locale: Locale;
  offered: readonly Locale[];
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, offered }), [locale, offered]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useOfferedLocales(): readonly Locale[] {
  return useContext(LocaleContext).offered;
}

export function useMessages(): Messages {
  return messagesFor(useLocale());
}
