import type { ArtifactKind, Passage, Standing } from "@understory/core/types";
import type { Locale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { presented, type WhyChange, type WhyModel, type WhyUnsustained } from "../why/why-model";
import type { ViewArtifact } from "../model/types";
import { dayDate, displayId } from "./artifact-copy";
import { factText, placeText, scopeText } from "./reading-copy";

export function standingText(standing: Standing, locale: Locale): string {
  const w = messagesFor(locale).why;
  return standing === "documented for the line" ? w.documented : w.likely;
}

export function contextText(carried: boolean, locale: Locale): string {
  const w = messagesFor(locale).why;
  return carried ? w.alsoQuoted : w.fromRecord;
}

export const shortId = (id: string) => id.replace(/^commit:/, "");

export function changeText(
  change: Pick<WhyChange, "id" | "date" | "last" | "did">,
  locale: Locale,
): string {
  const w = messagesFor(locale).why;
  return [
    change.last ? w.lastChange : w.earlierChange,
    shortId(change.id),
    dayDate(change.date, locale),
    change.did ? factText({ did: change.did, before: null }, locale) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function titledText(title: string, locale: Locale): string {
  return messagesFor(locale).why.titled(title);
}

export type SourceName = { kind: ArtifactKind | null; name: string };

export function sourceNamer(artifacts: ViewArtifact[]): (id: string) => SourceName {
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  return (id) => {
    const a = byId.get(id);
    return a ? { kind: a.kind, name: displayId(a) } : { kind: null, name: id };
  };
}

export function passageWhere(source: SourceName, passage: Passage, locale: Locale): string {
  const w = messagesFor(locale).why;
  const parts = passage.placement
    ? ""
    : (passage.parts ?? []).map((part) => w.part[part]).join(` ${w.and} `);
  const head = source.kind === "commit" ? w.commitHead : source.name;
  const place = passage.placement ? placeText(passage.placement, locale, passage.outdated) : null;
  return [w.where(head, parts), place].filter(Boolean).join(" · ");
}

export function qualityText(quality: WhyUnsustained["quality"], locale: Locale): string {
  return messagesFor(locale).why.quality[quality];
}

export function notEstablishedText(n: number, locale: Locale): string {
  return messagesFor(locale).why.notEstablished(n);
}

export function whyCopy(
  model: WhyModel,
  source: (id: string) => SourceName,
  locale: Locale,
): string | null {
  const w = messagesFor(locale).why;
  const shown = presented(model);
  if (shown.length === 0) return null;
  const item = ({ change, entry, sentence }: (typeof shown)[number]) =>
    [
      `- ${sentence}`,
      `  ${shortId(change.id)}, ${change.last ? w.theLastChange : w.anEarlierChange}, ${dayDate(change.date, locale)}`,
      ...entry.passages.map(
        (passage) =>
          `  ${passageWhere(source(passage.source), { ...passage, placement: undefined }, locale)}, ${scopeText(
            {
              scope: entry.scope,
              ...(passage.placement ? { placement: passage.placement } : {}),
              ...(passage.outdated !== undefined ? { outdated: passage.outdated } : {}),
            },
            locale,
          )}`,
      ),
    ].join("\n");
  const documented = shown.filter((s) => s.entry.standing === "documented for the line");
  const likely = shown.filter((s) => s.entry.standing === "inferred");
  return [
    documented.length ? [`${w.documented}:`, ...documented.map(item)] : [],
    likely.length ? [`${likely.length === 1 ? w.likely : w.likelyMany}:`, ...likely.map(item)] : [],
  ]
    .filter((group) => group.length)
    .map((group) => group.join("\n"))
    .join("\n\n");
}
