import type { Evidence, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { checkExpect, outcomeOf, parseArgs, selectCases, tally } from "./eval-check";

const evidence: Evidence = {
  question: "Why cap the retries at 3?",
  repo: { path: ".demo/payments-service", name: "payments-service" },
  artifacts: [
    {
      id: "commit:c038fb3",
      kind: "commit",
      title: "billing: bound charge retries with exponential backoff",
      body: "Unbounded retries double-charged customers during INC-1187.",
      url: "",
      date: "2023-09-03",
    },
    {
      id: "commit:0016d9d",
      kind: "commit",
      title: "billing: add jitter to retry backoff",
      body: "Clients were retrying in lockstep.",
      url: "",
      date: "2023-09-05",
    },
  ],
  contradictions: [],
};

const narrative = (over: Partial<VerifiedNarrative> = {}): VerifiedNarrative => ({
  answer: "Retries were capped after INC-1187.",
  claims: [],
  citations: ["commit:c038fb3"],
  recorded: true,
  answerable: true,
  grounded: true,
  unknownCitations: [],
  ungroundedClaims: 0,
  confidence: { score: 0.8, level: "high", primarySources: 1, corroborating: 0, contradicting: 0 },
  ...over,
});

describe("checkExpect", () => {
  it("passes when every stated field holds and a cited source matches", () => {
    expect(
      checkExpect(
        {
          answerable: true,
          recorded: true,
          grounded: true,
          minScore: 0.65,
          citesBodyMatch: "INC-1187",
        },
        narrative(),
        evidence,
      ),
    ).toEqual([]);
  });

  it("names each broken expectation", () => {
    const fails = checkExpect(
      { recorded: true, minScore: 0.65, level: "high", citesBodyMatch: "lockstep" },
      narrative({
        recorded: false,
        confidence: {
          score: 0.4,
          level: "low",
          primarySources: 0,
          corroborating: 0,
          contradicting: 0,
        },
      }),
      evidence,
    );
    expect(fails).toEqual([
      "recorded false ≠ true",
      "score 0.4 < 0.65",
      "level low ≠ high",
      "no cited source matches /lockstep/",
    ]);
  });

  it("only looks at sources the answer actually cites", () => {
    expect(checkExpect({ citesBodyMatch: "jitter" }, narrative(), evidence)).toHaveLength(1);
  });

  it("tells an answer that asserts claims from one that stays silent", () => {
    const claim = { text: "Capped after INC-1187.", citations: ["commit:c038fb3"], grounded: true };
    expect(checkExpect({ asserts: false }, narrative(), evidence)).toEqual([]);
    expect(checkExpect({ asserts: false }, narrative({ claims: [claim] }), evidence)).toEqual([
      "asserts true ≠ false",
    ]);
    expect(checkExpect({ asserts: true }, narrative(), evidence)).toEqual(["asserts false ≠ true"]);
  });

  it("holds the score under a ceiling, the answer to its language and its text to a pattern", () => {
    const fails = checkExpect(
      { maxScore: 0.65, language: "pt", answerNotMatch: "capped" },
      narrative({ language: "en" }),
      evidence,
    );
    expect(fails).toEqual(["score 0.8 > 0.65", "language en ≠ pt", "answer matches /capped/"]);
    expect(checkExpect({ answerNotMatch: "GDPR" }, narrative(), evidence)).toEqual([]);
  });
});

describe("outcomeOf and tally", () => {
  it("keeps model errors out of the scored runs", () => {
    const oos = { answerable: false };
    const runs = [
      {
        expect: oos,
        outcome: outcomeOf(oos, { narrative: narrative({ answerable: false }) }, evidence),
      },
      { expect: oos, outcome: outcomeOf(oos, { narrative: narrative() }, evidence) },
      {
        expect: oos,
        outcome: outcomeOf(oos, { narrative: null, error: "rate-limited" }, evidence),
      },
      {
        expect: { recorded: true },
        outcome: outcomeOf({ recorded: true }, { narrative: narrative() }, evidence),
      },
    ];
    expect(runs.map((r) => r.outcome.kind)).toEqual(["pass", "fail", "error", "pass"]);
    expect(tally(runs)).toEqual({
      runs: 4,
      passed: 2,
      failed: 1,
      review: 0,
      errored: 1,
    });
  });

  it("leaves a case with a rubric for manual review unless an automatic check already fails", () => {
    const rubric = { grounded: true, review: "Pass if it corrects the premise." };
    const held = outcomeOf(rubric, { narrative: narrative() }, evidence);
    const broken = outcomeOf(rubric, { narrative: narrative({ grounded: false }) }, evidence);
    expect(held.kind).toBe("review");
    expect(broken.kind).toBe("fail");
    expect(tally([{ expect: rubric, outcome: held }]).review).toBe(1);
  });
});

describe("parseArgs", () => {
  it("reads repeat, delay and case ids in any order", () => {
    expect(parseArgs(["retry-cap", "--repeat", "5", "--delay", "2000", "jitter"])).toEqual({
      repeat: 5,
      delayMs: 2000,
      only: ["retry-cap", "jitter"],
      out: null,
      set: null,
      category: null,
      problems: [],
    });
    expect(parseArgs([])).toEqual({
      repeat: 1,
      delayMs: 0,
      only: [],
      out: null,
      set: null,
      category: null,
      problems: [],
    });
  });

  it("reads the output path and the set and category filters", () => {
    const args = parseArgs([
      "--set",
      "v1",
      "--out",
      "eval/results/run.jsonl",
      "--category",
      "silent",
    ]);
    expect(args).toMatchObject({
      only: [],
      out: "eval/results/run.jsonl",
      set: "v1",
      category: "silent",
    });
  });
});

describe("parseArgs problems", () => {
  const problems = (...argv: string[]) => parseArgs(argv).problems;

  it("names an option it does not know, with or without an equals sign", () => {
    expect(problems("--sets", "v1")).toEqual(["unknown option --sets"]);
    expect(problems("--set=v1")).toEqual(["unknown option --set=v1"]);
    expect(parseArgs(["--sets", "v1"]).only).toEqual(["v1"]);
  });

  it("refuses an option with no value, or with another option where its value should be", () => {
    expect(problems("--set")).toEqual(["--set needs a value"]);
    expect(problems("--out", "--set", "v1")).toEqual(["--out needs a value"]);
    expect(parseArgs(["--out", "--set", "v1"]).set).toBe("v1");
  });

  it("refuses an option given twice and a count that is not a number", () => {
    expect(problems("--set", "v1", "--set", "v2")).toEqual(["--set is given twice"]);
    expect(problems("--repeat", "two")).toEqual(["--repeat needs a number of at least 1"]);
    expect(problems("--repeat", "0")).toEqual(["--repeat needs a number of at least 1"]);
    expect(problems("--delay", "-5")).toEqual(["--delay needs a number of at least 0"]);
  });
});

describe("selectCases", () => {
  const gold = {
    repo: ".demo/payments-service",
    cases: [
      { id: "a", set: "v1", category: "recorded", location: "f:1", question: "?", expect: {} },
      { id: "b", set: "v1", category: "silent", location: "f:2", question: "?", expect: {} },
      { id: "c", set: "v2", category: "silent", location: "f:3", question: "?", expect: {} },
    ],
  };
  const pick = (over: Partial<Parameters<typeof selectCases>[1]>) =>
    selectCases(gold, { only: [], set: null, category: null, ...over }).map((c) => c.id);

  it("narrows by id, set and category together", () => {
    expect(pick({})).toEqual(["a", "b", "c"]);
    expect(pick({ set: "v1" })).toEqual(["a", "b"]);
    expect(pick({ category: "silent" })).toEqual(["b", "c"]);
    expect(pick({ set: "v2", category: "silent", only: ["b", "c"] })).toEqual(["c"]);
  });
});
