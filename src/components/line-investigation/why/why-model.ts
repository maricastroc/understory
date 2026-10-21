import type {
  ChangeEntry,
  Explanation,
  Passage,
  Quality,
  Reading,
  ReasonScope,
  Standing,
} from "@understory/core/types";

export type WhyEntry = {
  claim: number;
  scope: ReasonScope;
  standing: Standing | null;
  sentence: string | null;
  passages: Passage[];
};

export type WhyChange = {
  id: string;
  date: string;
  title: string;
  last: boolean;
  did: NonNullable<ChangeEntry["did"]> | null;
  entries: WhyEntry[];
};

export type WhyUnsustained = {
  claim: number;
  text: string;
  quality: Exclude<Quality, "stated by a cited source">;
};

export type WhyModel = {
  explanation: Explanation;
  changes: WhyChange[];
  unsustained: WhyUnsustained[];
};

const newestFirst = (a: ChangeEntry, b: ChangeEntry) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

const carriersFirst = (a: WhyEntry, b: WhyEntry) =>
  Number(b.standing !== null) - Number(a.standing !== null) || a.claim - b.claim;

export function whyModel(reading: Reading): WhyModel {
  const changes = [...reading.changes]
    .sort(newestFirst)
    .map((change): WhyChange => ({
      id: change.id,
      date: change.date,
      title: change.title,
      last: change.last,
      did: change.did ?? null,
      entries: change.reasons
        .map((reason) => ({
          claim: reason.claim,
          scope: reason.scope,
          standing: reason.standing ?? null,
          sentence: reason.standing ? (reason.sentence ?? null) : null,
          passages: reason.passages,
        }))
        .sort(carriersFirst),
    }))
    .filter(
      (change) =>
        change.entries.length > 0 || (reading.explanation === "not identified" && change.last),
    );
  return {
    explanation: reading.explanation,
    changes,
    unsustained: reading.unsustained.map(({ claim, text, quality }) => ({ claim, text, quality })),
  };
}

export const standingOf = (reading: Reading | null | undefined, claim: number): Standing | null =>
  reading?.changes
    .flatMap((change) => change.reasons)
    .find((reason) => reason.claim === claim && reason.standing)?.standing ?? null;

export const presented = (model: WhyModel) =>
  model.changes.flatMap((change) =>
    change.entries.flatMap((entry) =>
      entry.standing && entry.sentence ? [{ change, entry, sentence: entry.sentence }] : [],
    ),
  );
