import { coreText } from "@/i18n/core-text";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { AI_DAILY_LIMIT_REACHED } from "@/lib/ai-limit";
import type { ChecklistItem } from "../model/types";

export function writerError(error: string, locale: Locale): string {
  return error === AI_DAILY_LIMIT_REACHED ? messagesFor(locale).errors.aiUnavailable : error;
}

export function checklistText(item: ChecklistItem, locale: Locale): string {
  const v = messagesFor(locale).verdict;
  switch (item.kind) {
    case "clauses-grounded":
      return v.grounded(item.grounded, item.total);
    case "citations-resolved":
      return item.unknown.length
        ? v.resolvedUnknown(item.resolved, item.total, item.unknown.join(", "))
        : v.resolved(item.resolved, item.total);
    case "quotes": {
      const parts = [v.verbatim(item.verified), v.misattributed(item.misattributed)];
      if (item.weak) parts.push(v.weak(item.weak));
      if (item.unaudited) parts.push(v.unaudited(item.unaudited));
      return parts.join(", ");
    }
    case "audit-unavailable":
      return v.auditUnavailable;
    case "uncited-claims":
      return v.uncited(item.count);
    case "contradictions":
      return item.items.map((c) => `${c.artifactId}: ${c.detail}`).join("; ");
    case "file-granularity":
      return item.note ? coreText(locale, "fileLevelNote", item.note) : v.fileLevel;
    case "collection-note":
      return item.note;
    case "cosmetic-origin":
      return v.cosmetic(item.ref);
    case "not-recorded":
      return item.answer;
    case "out-of-scope":
      return item.answer;
    case "evidence-only":
      return item.error ? writerError(item.error, locale) : v.noReconstruction;
  }
}

export function checklistGlyph(item: ChecklistItem): string {
  if (item.tone === "ok") return "✓";
  if (item.tone === "silent") return "◌";
  if (item.tone === "caveat") return "!";
  return "·";
}
