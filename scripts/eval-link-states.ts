import {
  type CaseFacts as CoreFacts,
  type SourceFacts,
  qualityOf,
  specificityOf,
  stateOf,
} from "@understory/core/reading";
import type { Quality, Specificity, State } from "@understory/core/types";

export type { SourceFacts, Specificity, State };
export type Evidence = Quality;
export type CaseFacts = CoreFacts & { id: string };

export const evidenceOf = qualityOf;
export { specificityOf, stateOf };

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
