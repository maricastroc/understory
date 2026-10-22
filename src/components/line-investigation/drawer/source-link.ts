import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

export function sourceLinkLabel(url: string, locale: Locale): string {
  const a = messagesFor(locale).artifact;
  try {
    const host = new URL(url).hostname;
    if (host === "github.com") return a.openOnGitHub;
    if (host.includes("gitlab")) return a.openOnGitLab;
    return a.openSource;
  } catch {
    return a.openSource;
  }
}
