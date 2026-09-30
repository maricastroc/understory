import { dayDate, tickText } from "../../../line-investigation/copy/artifact-copy";
import { tallyText } from "../../../line-investigation/copy/clause-copy";
import { shortAge } from "../../../line-investigation/format/age";
import type { InvestigationView, ViewClause } from "../../../line-investigation/model/types";
import type { Stratum } from "./types";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function summaryText(view: InvestigationView): string {
  const silences = view.gaps.filter((g) => g.verified).length;
  return [
    plural(view.artifacts.length, "artifact"),
    plural(view.clauses.length, "clause"),
    ...(silences ? [plural(silences, "silence")] : []),
  ].join(" · ");
}

export function askedText(token: string | null, line: number): string {
  return token ? `asked of the token ${token} · line ${line}` : `asked of line ${line}`;
}

export function currentCaption(line: number): string {
  return `commit · wrote line ${line} as it reads today`;
}

export function marginDate(s: Stratum): { date: string; depth: string | null } {
  const full = dayDate(s.artifact.date);
  if (s.layer === "sub") return { date: full.split(" ").slice(0, 2).join(" "), depth: null };
  const days = s.artifact.daysBeforeNow;
  return { date: full, depth: days === null ? null : tickText(days) };
}

export function unchangedText(days: number): string {
  return `unchanged for ${shortAge(days)}`;
}

export function silenceTitle(isOrigin: boolean): string {
  return isOrigin ? "The line’s origin is silent" : "The record is silent here";
}

export function originText(line: number, days: number | null): string | null {
  return days === null
    ? null
    : `origin · line ${line} first written ${(days / 365.25).toFixed(1)}y deep`;
}

export function strataTally(clause: ViewClause): string {
  if (clause.silent || clause.audit !== "supported") return tallyText(clause);
  const verified = clause.cells.filter((c) => c.state === "verified").length;
  const known = clause.cells.filter((c) => c.state !== "unknown").length;
  return `${plural(known, "source")} · ${plural(verified, "quote")} verified`;
}
