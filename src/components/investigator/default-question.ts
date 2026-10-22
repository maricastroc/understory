import { anchorQuestion } from "@understory/core/anchor-question";
import type { ArtifactKind } from "@understory/core/types";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";

export const LINE_QUESTION = "Why is this line the way it is?";
export const RANGE_QUESTION = "Why are these lines the way they are?";
export const DEEP_LINK_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

const SYMBOL_QUESTION = /^Why is (.+) the way it is\?$/;

export function defaultQuestion(target: { start: number; end: number; name?: string | null }) {
  if (target.name) return `Why is ${target.name} the way it is?`;
  return target.start === target.end ? LINE_QUESTION : RANGE_QUESTION;
}

export function isDefaultQuestion(question: string): boolean {
  const q = question.trim();
  return q === LINE_QUESTION || q === RANGE_QUESTION || q === DEEP_LINK_QUESTION;
}

export function shownQuestion(question: string, locale: Locale): string {
  const q = messagesFor(locale).questions;
  const asked = question.trim();
  if (asked === LINE_QUESTION) return q.line;
  if (asked === RANGE_QUESTION) return q.range;
  if (asked === DEEP_LINK_QUESTION) return q.deepLink;
  const kind = (Object.keys(anchorQuestion) as ArtifactKind[]).find(
    (k) => anchorQuestion[k] === asked,
  );
  if (kind) return q.anchor[kind];
  const symbol = SYMBOL_QUESTION.exec(asked);
  return symbol ? q.symbol(symbol[1]) : question;
}
