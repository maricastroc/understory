import { longAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { CoreHistory, CoreStatus, MapCore } from "./types";

export function coreLabel(
  core: MapCore,
  status: CoreStatus,
  history: CoreHistory | null,
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const c = m.map.core;
  const cases = core.cases ? `, ${c.cases(core.cases)}` : "";
  const state =
    status === "mapped" && history
      ? (history.cut ? c.oldestAtLeast : c.oldest)(longAge(m.time, history.oldestDays))
      : status === "mapping"
        ? c.mapping
        : status === "unavailable"
          ? c.unavailable
          : status === "too-large"
            ? c.tooLarge
            : c.notMapped;
  return `${core.dir}${core.name}, ${state}${cases}`;
}

export function statusFacts(status: CoreStatus, locale: Locale): string {
  const s = messagesFor(locale).map.status;
  if (status === "mapping") return s.mapping;
  if (status === "unavailable") return s.unavailable;
  if (status === "too-large") return s.tooLarge;
  return s.notMapped;
}
