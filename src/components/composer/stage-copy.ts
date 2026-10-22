import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { ComposerStage } from "./types/composer-stage";

export function stageCopy(
  input: {
    stage: ComposerStage;
    connecting: boolean;
    fileLoading: boolean;
    about: string | null;
  },
  locale: Locale,
): { title: string; lead: string } {
  const s = messagesFor(locale).composer.stage;
  if (input.stage === "repo") return input.connecting ? s.openingRepo : s.openRepo;
  if (input.stage === "file") return s.findFile;
  if (input.fileLoading) return s.openingFile;
  if (!input.about) return s.chooseLine;
  return { title: s.ask(input.about), lead: s.askLead };
}
