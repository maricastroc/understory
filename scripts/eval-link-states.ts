import type { EntailmentStatus } from "@understory/core/types";
import type { Placement, SourceLink } from "./eval-link-signals";

export type SourceFacts = {
  kind: string;
  link: SourceLink;
  comments: Array<{ placement: Placement; outdated: boolean }>;
};

export type CaseFacts = {
  id: string;
  granularity: string | null;
  alone: boolean;
  sources: Record<string, SourceFacts>;
};

export type Evidence = "stated by a cited source" | "insufficient" | "refuted" | "absent";

export type Specificity =
  | "direct: a review comment on the line"
  | "direct: the change is this block alone"
  | "the change that last changed the line"
  | "another change in the line's history"
  | "the file's history"
  | "none";

export type State =
  | "directly linked to the line"
  | "recorded for the change, no specific link shown"
  | "not sustained";

export const evidenceOf = (status: EntailmentStatus | null | undefined): Evidence =>
  status === "supported"
    ? "stated by a cited source"
    : status === "weak"
      ? "insufficient"
      : status === "unsupported"
        ? "refuted"
        : "absent";

const ORDER: Specificity[] = [
  "direct: a review comment on the line",
  "direct: the change is this block alone",
  "the change that last changed the line",
  "another change in the line's history",
  "the file's history",
  "none",
];

function specificityOfSource(facts: CaseFacts, source: SourceFacts): Specificity {
  if (facts.granularity === "file") return "the file's history";
  const anchored = source.comments.some(
    (c) => c.placement === "on the line" || c.placement === "in its hunk",
  );
  if (source.kind === "review" && anchored) return "direct: a review comment on the line";
  if (source.link === "this change")
    return facts.alone
      ? "direct: the change is this block alone"
      : "the change that last changed the line";
  return source.link === "another change" ? "another change in the line's history" : "none";
}

export function specificityOf(facts: CaseFacts | undefined, cited: string[]): Specificity {
  const found = cited.flatMap((id) => (facts?.sources[id] ? [facts.sources[id]] : []));
  if (!facts || found.length === 0) return "none";
  const each = found.map((source) => specificityOfSource(facts, source));
  return ORDER.find((level) => each.includes(level)) ?? "none";
}

export function stateOf(evidence: Evidence, specificity: Specificity): State {
  if (evidence !== "stated by a cited source" || specificity === "none") return "not sustained";
  return specificity.startsWith("direct")
    ? "directly linked to the line"
    : "recorded for the change, no specific link shown";
}

export type Anchoring =
  | "on the line or in its hunk"
  | "elsewhere in the file"
  | "elsewhere in the file, outdated"
  | "in another file"
  | "in another file, outdated"
  | "a review with no placed comment";

export function anchoringOf(facts: CaseFacts | undefined, cited: string[]): Anchoring | null {
  const reviews = cited.flatMap((id) =>
    facts?.sources[id]?.kind === "review" ? [facts.sources[id]] : [],
  );
  if (reviews.length === 0) return null;
  const comments = reviews.flatMap((r) => r.comments);
  if (comments.length === 0) return "a review with no placed comment";
  if (comments.some((c) => c.placement === "on the line" || c.placement === "in its hunk"))
    return "on the line or in its hunk";
  const sameFile = comments.filter((c) => c.placement === "same file, elsewhere");
  const pool = sameFile.length ? sameFile : comments;
  const outdated = pool.every((c) => c.outdated);
  const where = sameFile.length ? "elsewhere in the file" : "in another file";
  return `${where}${outdated ? ", outdated" : ""}` as Anchoring;
}

const CAUSAL =
  /\b(because|so that|in order to|due to|therefore|thus|as a result|which is why|to (avoid|prevent|fix|support|allow|ensure|make|stop|enable|handle|protect|follow|provide|keep|satisfy|address|remove|reduce|let)|(added|introduced|rewritten|changed|capped|set|renamed|made|written|bounded|limited) (so|to)\b|porque|por isso|para (que|evitar|garantir|impedir|permitir)|de modo que)\b/i;

export const isCausal = (text: string): boolean => CAUSAL.test(text);

export function crossTab<T>(
  rows: T[],
  rowOf: (row: T) => string,
  columnOf: (row: T) => string,
): Record<string, Record<string, number>> {
  const table: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const line = (table[rowOf(row)] ??= {});
    line[columnOf(row)] = (line[columnOf(row)] ?? 0) + 1;
  }
  return table;
}
