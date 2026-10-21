import type { ArtifactKind, Passage, RecordPart, Standing } from "@understory/core/types";
import { presented, type WhyChange, type WhyModel, type WhyUnsustained } from "../why/why-model";
import type { ViewArtifact } from "../model/types";
import { dayDate, displayId } from "./artifact-copy";
import { factText, placeText, scopeText } from "./reading-copy";

export const WHY_TITLE = "What the history supports";

export const NOT_IDENTIFIED = "No reason for this line is established in the record.";

const STANDING: Record<Standing, string> = {
  "documented for the line": "Documented for this line",
  inferred: "Likely explanation",
};

export const standingText = (standing: Standing) => STANDING[standing];

export const contextText = (carried: boolean) =>
  carried ? "Also quoted for this sentence" : "From this change's record";

export const shortId = (id: string) => id.replace(/^commit:/, "");

export function changeText(change: Pick<WhyChange, "id" | "date" | "last" | "did">): string {
  return [
    change.last ? "last change" : "earlier change",
    shortId(change.id),
    dayDate(change.date),
    change.did ? factText({ did: change.did, before: null }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const titledText = (title: string) => `titled “${title}”`;

const PART: Record<RecordPart, string> = {
  title: "title",
  message: "message",
  description: "description",
  discussion: "discussion",
  "review summary": "summary",
  "review comment": "comment",
};

export type SourceName = { kind: ArtifactKind | null; name: string };

export function sourceNamer(artifacts: ViewArtifact[]): (id: string) => SourceName {
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  return (id) => {
    const a = byId.get(id);
    return a ? { kind: a.kind, name: displayId(a) } : { kind: null, name: id };
  };
}

export function passageWhere(source: SourceName, passage: Passage): string {
  const parts = passage.placement
    ? ""
    : (passage.parts ?? []).map((part) => PART[part]).join(" and ");
  const head = source.kind === "commit" ? "commit" : source.name;
  const place = passage.placement ? placeText(passage.placement, passage.outdated) : null;
  return [[head, parts].filter(Boolean).join(" "), place].filter(Boolean).join(" · ");
}

const QUALITY: Record<WhyUnsustained["quality"], string> = {
  insufficient: "insufficient: the cited sources do not say this",
  refuted: "refuted: the cited sources say something else",
  absent: "absent: no cited source was checked",
};

export const qualityText = (quality: WhyUnsustained["quality"]) => QUALITY[quality];

export const notEstablishedText = (n: number) => `Not established · ${n}`;

export function whyCopy(model: WhyModel, source: (id: string) => SourceName): string | null {
  const shown = presented(model);
  if (shown.length === 0) return null;
  const item = ({ change, entry, sentence }: (typeof shown)[number]) =>
    [
      `- ${sentence}`,
      `  ${shortId(change.id)}, ${change.last ? "the last change" : "an earlier change"}, ${dayDate(change.date)}`,
      ...entry.passages.map(
        (passage) =>
          `  ${passageWhere(source(passage.source), { ...passage, placement: undefined })}, ${scopeText(
            {
              scope: entry.scope,
              ...(passage.placement ? { placement: passage.placement } : {}),
              ...(passage.outdated !== undefined ? { outdated: passage.outdated } : {}),
            },
          )}`,
      ),
    ].join("\n");
  const documented = shown.filter((s) => s.entry.standing === "documented for the line");
  const likely = shown.filter((s) => s.entry.standing === "inferred");
  return [
    documented.length ? [`${STANDING["documented for the line"]}:`, ...documented.map(item)] : [],
    likely.length
      ? [
          `${likely.length === 1 ? "Likely explanation" : "Likely explanations"}:`,
          ...likely.map(item),
        ]
      : [],
  ]
    .filter((group) => group.length)
    .map((group) => group.join("\n"))
    .join("\n\n");
}
