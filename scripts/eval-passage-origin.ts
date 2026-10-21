import { locateQuote } from "@understory/core/quote";
import { placementOf, readAnswer } from "@understory/core/reading";
import type {
  Artifact,
  ArtifactKind,
  Evidence,
  Lineage,
  PlacedComment,
  Placement,
} from "@understory/core/types";
import { owningCommitOf } from "./eval-link-signals";

export type Part =
  "title" | "message" | "description" | "discussion" | "review summary" | "review comment";

export type Segment = { part: Part; start: number; end: number };

export const DISCUSSION = "\n\n— discussion —\n";

const FOLDED_COMMENT = /^@[\w-]+: /;

export function segmentsOf(source: Pick<Artifact, "kind" | "body">): Segment[] {
  const { kind, body } = source;
  const marker = body.indexOf(DISCUSSION);
  const thread = marker < 0 ? body.length : marker + DISCUSSION.length;
  const header = marker < 0 ? body.length : marker;
  if (kind === "review") {
    if (marker < 0)
      return [
        {
          part: FOLDED_COMMENT.test(body) ? "review comment" : "review summary",
          start: 0,
          end: body.length,
        },
      ];
    return [
      { part: "review summary", start: 0, end: header },
      { part: "review comment", start: thread, end: body.length },
    ];
  }
  const firstBreak = body.indexOf("\n");
  const title = firstBreak < 0 ? header : Math.min(firstBreak, header);
  const all: Segment[] = [
    { part: "title", start: 0, end: title },
    { part: kind === "commit" ? "message" : "description", start: title, end: header },
    { part: "discussion", start: thread, end: body.length },
  ];
  return all.filter((segment) => body.slice(segment.start, segment.end).trim() !== "");
}

export function partsOf(source: Pick<Artifact, "kind" | "body">, quote: string): Part[] {
  const range = locateQuote(source.body, quote);
  if (!range) return [];
  return segmentsOf(source)
    .filter((segment) => segment.start < range.end && range.start < segment.end)
    .map((segment) => segment.part);
}

const KIND: Record<ArtifactKind, string> = {
  commit: "commit",
  pull_request: "pull request",
  issue: "issue",
  review: "review",
};

export const sitsIn = (kind: string, parts: Part[]): string =>
  parts.length === 0
    ? "not located"
    : parts
        .map((part) =>
          part.startsWith("review") ? part : `${KIND[kind as ArtifactKind] ?? kind} ${part}`,
        )
        .join(" + ");

const flat = (text: string) => text.replace(/\s+/g, " ").trim();

export function commentHolding(source: Artifact, quote: string): PlacedComment | null {
  const wanted = flat(quote).replace(FOLDED_COMMENT, "");
  const holding = (source.comments ?? []).filter((comment) => flat(comment.body).includes(wanted));
  return holding.length === 1 ? holding[0] : null;
}

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
  parts: Part[];
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
  const comment = parts.includes("review comment") ? commentHolding(source, quote) : null;
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
