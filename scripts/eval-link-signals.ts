import { placementOf } from "@understory/core/reading";
import type { Artifact, PlacedComment } from "@understory/core/types";

export type Did = "added" | "rewrote" | "respaced" | "moved";
export type SourceLink = "this change" | "another change" | "unlinked";
export type Outcome = "credit" | "reject" | "inconclusive";

const COMMON = new Set(
  "the a an and or of to in on for with by is are was were be been it its this that these those as at from so not no into than then when which who whose what why how but if while do does did has have had will would can could should may might also all any each every some more most other another only just because since after before during about over under between both same such there their they them our your you we".split(
    " ",
  ),
);

const singular = (term: string) =>
  term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;

export function terms(text: string): Set<string> {
  const found = new Set<string>();
  for (const word of text.match(/[A-Za-z_][A-Za-z0-9_]*|\d+/g) ?? []) {
    const parts = [word, ...word.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_]+/)];
    for (const part of parts) {
      const term = singular(part.toLowerCase());
      if ((term.length >= 3 || /^\d+$/.test(term)) && !COMMON.has(term)) found.add(term);
    }
  }
  return found;
}

export const shared = (a: Set<string>, b: Set<string>): string[] => [...a].filter((t) => b.has(t));

export function changedTerms(before: string | null, after: string): Set<string> {
  const now = terms(after);
  if (before === null) return now;
  const then = terms(before);
  return new Set([
    ...[...now].filter((t) => !then.has(t)),
    ...[...then].filter((t) => !now.has(t)),
  ]);
}

const isAdded = (row: string) => row.startsWith("+") && !row.startsWith("+++");
const isRemoved = (row: string) => row.startsWith("-") && !row.startsWith("---");

export function patchRows(patch: string): { added: string[]; removed: string[] } {
  const rows = patch.replace(/\r\n/g, "\n").split("\n");
  return {
    added: rows.filter(isAdded).map((row) => row.slice(1)),
    removed: rows.filter(isRemoved).map((row) => row.slice(1)),
  };
}

export function blockAround(patch: string, line: string): string[] | null {
  const rows = patch.replace(/\r\n/g, "\n").split("\n");
  const hits = rows.flatMap((row, i) =>
    isAdded(row) && row.slice(1).trim() === line.trim() ? [i] : [],
  );
  if (hits.length !== 1) return null;
  let from = hits[0];
  let to = hits[0];
  while (from > 0 && (isAdded(rows[from - 1]) || isRemoved(rows[from - 1]))) from--;
  while (to < rows.length - 1 && (isAdded(rows[to + 1]) || isRemoved(rows[to + 1]))) to++;
  return rows.slice(from, to + 1);
}

export function whatItDid(line: string, before: string | null, removedAnywhere: string[]): Did {
  if (before !== null) return before.trim() === line.trim() ? "respaced" : "rewrote";
  const text = line.trim();
  const trivial = terms(text).size === 0;
  return !trivial && removedAnywhere.some((row) => row.trim() === text) ? "moved" : "added";
}

export function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

export function closest(text: string, claim: string): string {
  const wanted = terms(claim);
  let best = "";
  let most = -1;
  for (const sentence of sentences(text)) {
    const count = shared(terms(sentence), wanted).length;
    if (count > most) [best, most] = [sentence, count];
  }
  return best;
}

export function owningCommitOf(source: Artifact, byId: Map<string, Artifact>): Artifact | null {
  let at: Artifact | undefined = source;
  for (let hops = 0; at && at.kind !== "commit" && hops < 6; hops++)
    at = at.parentId ? byId.get(at.parentId) : undefined;
  return at?.kind === "commit" ? at : null;
}

export function linkOf(
  source: Artifact,
  lastChange: string | null,
  byId: Map<string, Artifact>,
): SourceLink {
  const commit = owningCommitOf(source, byId);
  if (!commit || !lastChange) return "unlinked";
  return commit.id === lastChange ? "this change" : "another change";
}

export type Signals = {
  did: Did | null;
  links: SourceLink[];
  alone: boolean;
  namesLine: boolean;
  namesBlock: boolean;
  namesElsewhere: boolean;
};

export type Verdicts = { supported: number; judged: number };

export function byStructureAlone(s: Signals): Outcome {
  if (s.did === "moved" || s.did === "respaced") return "reject";
  if (s.links.length === 0 || s.links.every((l) => l === "unlinked")) return "reject";
  return "inconclusive";
}

export function structureAsProof(s: Signals): Outcome {
  const refuted = byStructureAlone(s);
  if (refuted === "reject") return "reject";
  return s.links.includes("this change") && (s.alone || s.namesLine) ? "credit" : "inconclusive";
}

export function elsewhereTerms(
  passage: Set<string>,
  block: Set<string>,
  restOfTheChange: Set<string>,
): string[] {
  return [...passage].filter((t) => t.length >= 5 && restOfTheChange.has(t) && !block.has(t));
}

export function judgeThenStructure(s: Signals, judge: Verdicts, hintsRefute = false): Outcome[] {
  const refuted =
    byStructureAlone(s) === "reject" ||
    (hintsRefute && s.namesElsewhere && !s.namesLine && !s.namesBlock);
  const pointed = s.links.includes("this change") && (s.alone || s.namesLine);
  return Array.from({ length: judge.judged }, (_, i) => {
    if (i >= judge.supported || refuted) return "reject";
    return pointed ? "credit" : "inconclusive";
  });
}

export type { Placement } from "@understory/core/types";
export type ReviewComment = PlacedComment;
export { placementOf };

export function commentsOf(source: Artifact, all: ReviewComment[]): ReviewComment[] {
  const body = source.body.replace(/\s+/g, " ");
  return all.filter((c) => {
    const said = c.body.replace(/\s+/g, " ").trim();
    return said.length > 0 && body.includes(said.slice(0, 80));
  });
}
