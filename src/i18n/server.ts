import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale, localeFrom, offeredLocales } from "./locales";
import { messagesFor } from "./messages";

export function serverOfferedLocales(): Locale[] {
  return offeredLocales(process.env);
}

export async function getLocale(): Promise<Locale> {
  return localeFrom((await cookies()).get(LOCALE_COOKIE)?.value, serverOfferedLocales());
}

export async function getMessages() {
  return messagesFor(await getLocale());
}
