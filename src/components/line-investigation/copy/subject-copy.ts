import type { ArtifactRef } from "@understory/core/types";
import { shortAge } from "@/i18n/format";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import type { InvestigationView, ViewArtifact } from "../model/types";
import { displayId, kindName } from "./artifact-copy";
import type { CaseSubject } from "./types";

export function caseSubject(
  view: Pick<InvestigationView, "location" | "artifacts">,
  anchor: ArtifactRef | undefined,
  locale: Locale,
): CaseSubject {
  const s = messagesFor(locale).subject;
  const loc = view.location;
  if (loc) return { kind: "line", label: s.lines(loc.startLine, loc.endLine) };
  if (anchor) {
    const found = view.artifacts.find((a) => a.id === anchor.id);
    const ref = found ? displayId(found) : (anchor.ref ?? anchor.id);
    const noun = kindName(anchor.kind, locale);
    return {
      kind: "anchor",
      label: anchor.kind === "commit" ? s.commit(ref) : ref,
      id: anchor.id,
      artifact: anchor.kind,
      noun,
      ref,
    };
  }
  return { kind: "line", label: s.file };
}

export function historyTitle(subject: CaseSubject, locale: Locale): string {
  const s = messagesFor(locale).subject;
  return subject.kind === "line" ? s.historyOf(subject.label) : s.around(subject.label);
}

export function surfaceText(subject: CaseSubject, locale: Locale): string {
  const s = messagesFor(locale).subject;
  return subject.kind === "line" ? s.asItReadsNow(subject.label) : s.today;
}

export function breakText(
  subject: CaseSubject,
  days: number,
  first: boolean,
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const s = m.subject;
  const age = shortAge(m.time, days);
  if (subject.kind === "anchor") return first ? s.beforeToday(age) : s.between(age);
  return first ? s.unchangedFor(age) : s.noChange(age, subject.label);
}

export function breakMargin(subject: CaseSubject, first: boolean, locale: Locale): string {
  const margin = messagesFor(locale).subject.margin;
  if (subject.kind === "anchor") return first ? margin.beforeToday : margin.between;
  return first ? margin.unchanged : margin.noChange;
}

export function originText(subject: CaseSubject, locale: Locale): string {
  const s = messagesFor(locale).subject;
  return subject.kind === "line" ? s.oldestChange(subject.label) : s.earliestArtifact;
}

export function subjectCaption(
  subject: CaseSubject,
  a: ViewArtifact,
  current: boolean,
  locale: Locale,
): string | null {
  const s = messagesFor(locale).subject;
  if (subject.kind === "anchor") return a.id === subject.id ? s.asked[a.kind] : null;
  return current && a.kind === "commit" ? s.wrote(subject.label) : null;
}

export function commitRole(
  commit: ViewArtifact | null,
  current: ViewArtifact | null,
  subject: CaseSubject,
  locale: Locale,
): string | null {
  const s = messagesFor(locale).subject;
  if (!commit) return null;
  if (subject.kind === "anchor") return commit.id === subject.id ? s.asked.commit : null;
  return commit.id === current?.id ? s.wrote(subject.label) : s.earlierChange(subject.label);
}
