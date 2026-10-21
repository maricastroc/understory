import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale, localeFrom } from "./locales";
import { messagesFor } from "./messages";

export async function getLocale(): Promise<Locale> {
  return localeFrom((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getMessages() {
  return messagesFor(await getLocale());
}
