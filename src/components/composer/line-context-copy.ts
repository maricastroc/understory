import type { BlameSpan, HeadCommit } from "@understory/core/types";
import { fmtDate } from "../format";
import { shortAge } from "../line-investigation/format/age";
import { ageDays } from "./history/depth";

export type LastChange = {
  sha: string;
  author: string | null;
  date: string;
  age: string | null;
  commits: number;
};

export function lastChange(spans: BlameSpan[], head: HeadCommit | null): LastChange | null {
  if (!spans.length) return null;
  const newest = [...spans].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    sha: newest.shortSha,
    author: newest.author ?? null,
    date: fmtDate(newest.date),
    age: head ? shortAge(ageDays(head, newest.date)) : null,
    commits: new Set(spans.map((s) => s.sha)).size,
  };
}
