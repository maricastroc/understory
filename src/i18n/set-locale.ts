"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, offeredLocales } from "./locales";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocale(next: string): Promise<void> {
  if (!isLocale(next) || !offeredLocales(process.env).includes(next)) return;
  (await cookies()).set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
