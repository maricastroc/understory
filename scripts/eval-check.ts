import type { Evidence, VerifiedNarrative } from "@understory/core/types";

export type Expect = {
  answerable?: boolean;
  recorded?: boolean;
  grounded?: boolean;
  asserts?: boolean;
  minScore?: number;
  maxScore?: number;
  level?: "low" | "medium" | "high";
  language?: "en" | "pt";
  citesBodyMatch?: string;
  answerMatch?: string;
  answerNotMatch?: string;
  review?: string;
};

export type Case = {
  id: string;
  set?: string;
  category?: string;
  source?: string;
  repo?: string;
  location: string;
  question: string;
  why?: string;
  expect: Expect;
};

export type Gold = { repo: string; cases: Case[] };

export type Outcome =
  | { kind: "pass"; answerable: boolean }
  | { kind: "review"; answerable: boolean }
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
  if (e.asserts !== undefined && n.claims.length > 0 !== e.asserts)
    fails.push(`asserts ${n.claims.length > 0} ≠ ${e.asserts}`);
  if (e.minScore !== undefined && c.score < e.minScore)
    fails.push(`score ${c.score} < ${e.minScore}`);
  if (e.maxScore !== undefined && c.score > e.maxScore)
    fails.push(`score ${c.score} > ${e.maxScore}`);
  if (e.level !== undefined && c.level !== e.level) fails.push(`level ${c.level} ≠ ${e.level}`);
  if (e.language !== undefined && n.language !== e.language)
    fails.push(`language ${n.language ?? "unknown"} ≠ ${e.language}`);
  if (e.citesBodyMatch) {
    const re = new RegExp(e.citesBodyMatch, "i");
    const cited = ev.artifacts.filter((a) => n.citations.includes(a.id));
    if (!cited.some((a) => re.test(a.body) || re.test(a.title)))
      fails.push(`no cited source matches /${e.citesBodyMatch}/`);
  }
  if (e.answerMatch && !new RegExp(e.answerMatch, "i").test(n.answer))
    fails.push(`answer does not match /${e.answerMatch}/`);
  if (e.answerNotMatch && new RegExp(e.answerNotMatch, "i").test(n.answer))
    fails.push(`answer matches /${e.answerNotMatch}/`);
  return fails;
}

export function outcomeOf(
  e: Expect,
  result: { narrative: VerifiedNarrative | null; error?: string },
  ev: Evidence,
): Outcome {
  if (!result.narrative) return { kind: "error", message: result.error ?? "no narrative" };
  const { answerable } = result.narrative;
  const fails = checkExpect(e, result.narrative, ev);
  if (fails.length) return { kind: "fail", answerable, fails };
  return { kind: e.review ? "review" : "pass", answerable };
}

export type Tally = {
  runs: number;
  passed: number;
  failed: number;
  review: number;
  errored: number;
  refusals: { correct: number; total: number };
};

export function tally(runs: { expect: Expect; outcome: Outcome }[]): Tally {
  const t: Tally = {
    runs: 0,
    passed: 0,
    failed: 0,
    review: 0,
    errored: 0,
    refusals: { correct: 0, total: 0 },
  };
  for (const { expect, outcome } of runs) {
    t.runs += 1;
    if (outcome.kind === "pass") t.passed += 1;
    else if (outcome.kind === "fail") t.failed += 1;
    else if (outcome.kind === "review") t.review += 1;
    else t.errored += 1;
    if (expect.answerable === false && outcome.kind !== "error") {
      t.refusals.total += 1;
      if (!outcome.answerable) t.refusals.correct += 1;
    }
  }
  return t;
}

export type Args = {
  repeat: number;
  delayMs: number;
  only: string[];
  out: string | null;
  set: string | null;
  category: string | null;
};

const VALUE_FLAGS = ["--repeat", "--delay", "--out", "--set", "--category"];

export function parseArgs(argv: string[]): Args {
  const text = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? (argv[at + 1] ?? null) : null;
  };
  const flagged = new Set(
    VALUE_FLAGS.flatMap((f) => {
      const at = argv.indexOf(f);
      return at >= 0 ? [at, at + 1] : [];
    }),
  );
  return {
    repeat: Math.max(1, Math.floor(Number(text("--repeat"))) || 1),
    delayMs: Math.max(0, Number(text("--delay")) || 0),
    only: argv.filter((a, i) => !flagged.has(i) && !a.startsWith("--")),
    out: text("--out"),
    set: text("--set"),
    category: text("--category"),
  };
}

export function selectCases(gold: Gold, args: Pick<Args, "only" | "set" | "category">): Case[] {
  return gold.cases.filter(
    (c) =>
      (args.only.length === 0 || args.only.includes(c.id)) &&
      (args.set === null || c.set === args.set) &&
      (args.category === null || c.category === args.category),
  );
}
