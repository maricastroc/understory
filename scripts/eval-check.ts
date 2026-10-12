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
};

export function tally(runs: { expect: Expect; outcome: Outcome }[]): Tally {
  const t: Tally = { runs: 0, passed: 0, failed: 0, review: 0, errored: 0 };
  for (const { outcome } of runs) {
    t.runs += 1;
    if (outcome.kind === "pass") t.passed += 1;
    else if (outcome.kind === "fail") t.failed += 1;
    else if (outcome.kind === "review") t.review += 1;
    else t.errored += 1;
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
  via: "openrouter" | null;
  problems: string[];
};

const VALUE_FLAGS = ["--repeat", "--delay", "--out", "--set", "--category", "--via"];

export function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  const only: string[] = [];
  const problems: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      only.push(arg);
      continue;
    }
    if (!VALUE_FLAGS.includes(arg)) {
      problems.push(`unknown option ${arg}`);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      problems.push(`${arg} needs a value`);
      continue;
    }
    if (values.has(arg)) problems.push(`${arg} is given twice`);
    values.set(arg, value);
    i += 1;
  }
  const count = (flag: string, least: number) => {
    const raw = values.get(flag);
    if (raw === undefined) return least;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= least) return n;
    problems.push(`${flag} needs a number of at least ${least}`);
    return least;
  };
  const via = values.get("--via") ?? null;
  if (via !== null && via !== "openrouter") problems.push(`--via only knows "openrouter"`);
  return {
    repeat: Math.floor(count("--repeat", 1)),
    delayMs: count("--delay", 0),
    only,
    out: values.get("--out") ?? null,
    set: values.get("--set") ?? null,
    category: values.get("--category") ?? null,
    via: via === "openrouter" ? via : null,
    problems,
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
