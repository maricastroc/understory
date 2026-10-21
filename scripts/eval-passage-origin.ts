import { commentOf, placementOf, readAnswer } from "@understory/core/reading";
import { partsOf } from "@understory/core/record-part";
import type {
  Artifact,
  ArtifactKind,
  Evidence,
  Lineage,
  Placement,
  RecordPart,
} from "@understory/core/types";
import { owningCommitOf } from "./eval-link-signals";

const KIND: Record<ArtifactKind, string> = {
  commit: "commit",
  pull_request: "pull request",
  issue: "issue",
  review: "review",
};

export const sitsIn = (kind: string, parts: RecordPart[]): string =>
  parts.length === 0
    ? "not located"
    : parts
        .map((part) =>
          part.startsWith("review") ? part : `${KIND[kind as ArtifactKind] ?? kind} ${part}`,
        )
        .join(" + ");

export type ChangeFact = {
  id: string;
  date: string;
  title: string;
  last: boolean;
  did?: "added" | "rewrote" | "respaced";
  before?: string | null;
};

export function changesOf(ev: Evidence, lineage: Lineage | null = null): ChangeFact[] {
  const reading = readAnswer(lineage ? { ...ev, lineage } : ev, null);
  return (reading?.changes ?? []).map((change) => ({
    id: change.id,
    date: change.date,
    title: change.title,
    last: change.last,
    ...(change.did ? { did: change.did, before: change.before ?? null } : {}),
  }));
}

export type PassageOrigin = {
  id: string;
  source: string;
  kind: string;
  quote: string;
  parts: RecordPart[];
  placement?: Placement;
  outdated?: boolean;
  change: string | null;
  last: boolean;
};

const markedLine = (ev: Evidence): string =>
  ev.code && ev.location ? (ev.code.lines[ev.location.startLine - ev.code.startLine] ?? "") : "";

export function passageOrigin(
  id: string,
  ev: Evidence,
  source: Artifact,
  quote: string,
  changes: ChangeFact[],
): PassageOrigin {
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const change = owningCommitOf(source, byId)?.id ?? null;
  const parts = partsOf(source, quote);
  const comment = parts.includes("review comment") ? commentOf(source, quote) : undefined;
  const one =
    ev.location && ev.location.startLine === ev.location.endLine
      ? ev.location.startLine
      : undefined;
  return {
    id,
    source: source.id,
    kind: source.kind,
    quote,
    parts,
    ...(comment
      ? {
          placement: placementOf(comment, ev.location?.file ?? "", markedLine(ev), one),
          outdated: comment.outdated,
        }
      : {}),
    change,
    last: changes.some((known) => known.id === change && known.last),
  };
}

export const passageKey = (id: string, source: string, quote: string) =>
  JSON.stringify([id, source, quote]);

export type KeptOrigins = {
  cases: Array<{ id: string; changes: ChangeFact[] }>;
  passages: PassageOrigin[];
};

export function originIndex(kept: KeptOrigins): Map<string, PassageOrigin> {
  return new Map(kept.passages.map((p) => [passageKey(p.id, p.source, p.quote), p]));
}
