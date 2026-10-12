import type { ChangeEntry, Placement, Reading, ReasonScope } from "@understory/core/types";

export type PassageScope = { scope: ReasonScope; placement?: Placement; outdated?: boolean };

export type ChangeFact = { did: NonNullable<ChangeEntry["did"]>; before: string | null };

export type ReadingLayer = {
  history: Reading["history"];
  facts: Map<string, ChangeFact>;
  scopes: Map<string, PassageScope>;
  earlier: ChangeEntry[];
  edge: Reading["earlier"];
  reach: number | null;
};

const DAY = 86_400_000;

export const scopeKey = (artifactId: string, claim: number) => `${artifactId}|${claim}`;

export function readingLayer(
  reading: Reading | null | undefined,
  now: number,
): ReadingLayer | null {
  if (!reading) return null;
  const facts = new Map<string, ChangeFact>();
  const scopes = new Map<string, PassageScope>();
  for (const change of reading.changes) {
    if (!change.shownToTheModels) continue;
    if (change.did) facts.set(change.id, { did: change.did, before: change.before ?? null });
    for (const reason of change.reasons)
      for (const passage of reason.passages)
        scopes.set(scopeKey(passage.source, reason.claim), {
          scope: reason.scope,
          ...(passage.placement ? { placement: passage.placement } : {}),
          ...(passage.outdated !== undefined ? { outdated: passage.outdated } : {}),
        });
  }
  const newestFirst = [...reading.changes].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
  const earlier = newestFirst.filter((change) => !change.shownToTheModels);
  const oldest = newestFirst.at(-1);
  const began = reading.history === "the line" && oldest?.did === "added";
  const reached = earlier.length ? Date.parse(earlier[earlier.length - 1].date) : Number.NaN;
  return {
    history: reading.history,
    facts,
    scopes,
    earlier,
    edge: began ? null : reading.earlier,
    reach: Number.isNaN(reached) ? null : (now - reached) / DAY,
  };
}

export function extentOf(
  layer: ReadingLayer | null | undefined,
  changes: number,
  originDays: number | null,
): { changes: number; days: number | null } {
  if (!layer) return { changes, days: originDays };
  const deeper =
    layer.reach !== null && (originDays === null || layer.reach > originDays)
      ? layer.reach
      : originDays;
  return { changes: changes + layer.earlier.length, days: deeper };
}
