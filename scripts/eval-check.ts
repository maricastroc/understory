import type { Evidence, VerifiedNarrative } from "@understory/core/types";

export type Expect = {
  answerable?: boolean;
  recorded?: boolean;
  grounded?: boolean;
  minScore?: number;
  level?: "low" | "medium" | "high";
  citesBodyMatch?: string;
};

export type Case = {
  id: string;
  repo?: string;
  location: string;
  question: string;
  expect: Expect;
};

export type Gold = { repo: string; cases: Case[] };

export type Outcome =
  | { kind: "pass"; answerable: boolean }
  | { kind: "fail"; answerable: boolean; fails: string[] }
  | { kind: "error"; message: string };

export function checkExpect(e: Expect, n: VerifiedNarrative, ev: Evidence): string[] {
  const fails: string[] = [];
  const c = n.confidence;
  if (e.answerable !== undefined && n.answerable !== e.answerable)
    fails.push(`answerable ${n.answerable} ≠ ${e.answerable}`);
  if (e.recorded !== undefined && n.recorded !== e.recorded)
    fails.push(`recorded ${n.recorded} ≠ ${e.recorded}`);
  if (e.grounded !== undefined && n.grounded !== e.grounded)
    fails.push(`grounded ${n.grounded} ≠ ${e.grounded}`);
  if (e.minScore !== undefined && c.score < e.minScore)
    fails.push(`score ${c.score} < ${e.minScore}`);
  if (e.level !== undefined && c.level !== e.level) fails.push(`level ${c.level} ≠ ${e.level}`);
  if (e.citesBodyMatch) {
    const re = new RegExp(e.citesBodyMatch, "i");
    const cited = ev.artifacts.filter((a) => n.citations.includes(a.id));
    if (!cited.some((a) => re.test(a.body) || re.test(a.title)))
      fails.push(`no cited source matches /${e.citesBodyMatch}/`);
  }
  return fails;
}

export function outcomeOf(
  e: Expect,
  result: { narrative: VerifiedNarrative | null; error?: string },
  ev: Evidence,
): Outcome {
  if (!result.narrative) return { kind: "error", message: result.error ?? "no narrative" };
  const fails = checkExpect(e, result.narrative, ev);
  return fails.length
    ? { kind: "fail", answerable: result.narrative.answerable, fails }
    : { kind: "pass", answerable: result.narrative.answerable };
}

export type Tally = {
  runs: number;
  passed: number;
  failed: number;
  errored: number;
  refusals: { correct: number; total: number };
};

export function tally(runs: { expect: Expect; outcome: Outcome }[]): Tally {
  const t: Tally = {
    runs: 0,
    passed: 0,
    failed: 0,
    errored: 0,
    refusals: { correct: 0, total: 0 },
  };
  for (const { expect, outcome } of runs) {
    t.runs += 1;
    if (outcome.kind === "pass") t.passed += 1;
    else if (outcome.kind === "fail") t.failed += 1;
    else t.errored += 1;
    if (expect.answerable === false && outcome.kind !== "error") {
      t.refusals.total += 1;
      if (!outcome.answerable) t.refusals.correct += 1;
    }
  }
  return t;
}

export function parseArgs(argv: string[]): { repeat: number; delayMs: number; only: string[] } {
  const value = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? Number(argv[at + 1]) : NaN;
  };
  const flagged = new Set(
    ["--repeat", "--delay"].flatMap((f) => {
      const at = argv.indexOf(f);
      return at >= 0 ? [at, at + 1] : [];
    }),
  );
  return {
    repeat: Math.max(1, Math.floor(value("--repeat")) || 1),
    delayMs: Math.max(0, value("--delay") || 0),
    only: argv.filter((a, i) => !flagged.has(i) && !a.startsWith("--")),
  };
}
