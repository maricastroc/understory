import type { ShownReason, TreeOverview } from "@understory/core/types";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

function tally(files: TreeOverview["files"], reason: ShownReason): number {
  return files.filter((f) => f.reason === reason).length;
}

export function scopeWhy(overview: TreeOverview, counted: boolean, locale: Locale): string {
  const s = messagesFor(locale).map.scope;
  const files = overview.files;
  const recent = tally(files, "recent");
  const cases = tally(files, "case");
  const path = tally(files, "path");
  const commits = s.lastCommits(overview.recentCommits);
  const reasons = [recent, cases, path].filter(Boolean).length;
  if (!counted && reasons === 1) {
    if (recent) return s.changedIn(commits);
    if (cases) return s.whereCases;
    return s.byPath;
  }
  const parts: string[] = [];
  if (recent) parts.push(s.nChangedIn(recent, commits));
  if (cases) parts.push(s.nWithCases(cases));
  if (path) parts.push(s.nByPath(path));
  return parts.join(" · ");
}

export function scopeAbout(overview: TreeOverview, locale: Locale): string {
  const total = `${overview.truncated ? "≥" : ""}${formatNumber(locale, overview.total)}`;
  return messagesFor(locale).map.scope.about(overview.files.length, total);
}

export function whyShown(reason: ShownReason, recentCommits: number, locale: Locale): string {
  const s = messagesFor(locale).map.scope;
  if (reason === "case") return s.whyCase;
  if (reason === "recent") return s.whyRecent(s.lastCommits(recentCommits));
  return s.whyPath;
}

export function mappedLine(mapped: number, total: number, mapping: number, locale: Locale): string {
  const s = messagesFor(locale).map.scope;
  const line = s.mapped(mapped, total);
  return mapping ? `${line} · ${s.mappingNow(mapping)}` : line;
}
