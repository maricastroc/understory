import type { FileHistory, TreeOverview } from "@understory/core/types";
import { shortAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { markTone } from "./depth";
import type { CoreHistory } from "./types";

function percents(parts: number[]): string[] {
  const whole = parts.reduce((sum, n) => sum + n, 0);
  if (!whole) return parts.map(() => "0%");
  const exact = parts.map((n) => (100 * n) / whole);
  const rounded = exact.map(Math.floor);
  let left = 100 - rounded.reduce((sum, n) => sum + n, 0);
  const byRemainder = exact
    .map((e, i) => ({ i, rest: e - Math.floor(e) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    rounded[i] += 1;
    left -= 1;
  }
  return parts.map((n, i) => {
    if (!n) return "0%";
    if (rounded[i] === 0) return "<1%";
    if (rounded[i] === 100 && n < whole) return ">99%";
    return `${rounded[i]}%`;
  });
}

function tallyLines(histories: FileHistory[]) {
  const mapped = histories.filter((h) => h.status === "mapped");
  const lines = { found: 0, none: 0, unknown: 0 };
  for (const h of mapped) for (const m of h.marks) lines[markTone(m.prLookup)] += m.lines;
  return { mapped: mapped.length, ...lines, checked: lines.found + lines.none };
}

export function shareLine(
  histories: FileHistory[],
  prData: TreeOverview["prData"],
  locale: Locale,
): string | null {
  if (prData === "none") return null;
  const t = tallyLines(histories);
  if (t.mapped === 0 || t.checked === 0) return null;
  const s = messagesFor(locale).map.share;
  const [found, , unknown] = percents([t.found, t.none, t.unknown]);
  const line = s.havePr(found, s.mappedFiles(t.mapped));
  return t.unknown ? `${line} · ${s.unchecked(unknown)}` : line;
}

export function prAbsence(
  histories: FileHistory[],
  prData: TreeOverview["prData"],
  locale: Locale,
): string | null {
  const s = messagesFor(locale).map.share;
  if (prData === "none") return s.noPrData;
  const t = tallyLines(histories);
  if (t.mapped > 0 && t.checked === 0) return s.lookupsUnavailable(s.theMappedFiles(t.mapped));
  return null;
}

export function historyFacts(view: CoreHistory, locale: Locale): string {
  const m = messagesFor(locale);
  const age = `${view.cut ? "≥ " : ""}${shortAge(m.time, view.oldestDays)}`;
  const facts = `${m.map.share.oldest(age)} ${m.map.share.own(view.commits, view.lines)}`;
  return view.cut ? `${facts} ${m.map.share.cut}` : facts;
}

export function historyShares(view: CoreHistory, locale: Locale): string {
  const s = messagesFor(locale).map.share;
  const { found, none, unknown } = view.shares;
  const [foundPct, nonePct, unknownPct] = percents([found, none, unknown]);
  const parts = [
    found ? s.pr(foundPct) : "",
    none ? s.noPr(nonePct) : "",
    unknown ? s.unchecked(unknownPct) : "",
  ].filter(Boolean);
  return s.ofLines(parts.join(" · "));
}
