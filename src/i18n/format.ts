import type { Locale } from "./locales";

export function formatSeconds(locale: Locale, seconds: number): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "second",
    unitDisplay: "long",
  }).format(seconds);
}
