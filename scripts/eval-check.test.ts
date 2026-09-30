import type { Evidence, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { checkExpect, outcomeOf, parseArgs, tally } from "./eval-check";

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
});

describe("outcomeOf and tally", () => {
  it("keeps model errors out of the scored runs and counts refusals", () => {
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
      errored: 1,
      refusals: { correct: 1, total: 2 },
    });
  });
});

describe("parseArgs", () => {
  it("reads repeat, delay and case ids in any order", () => {
    expect(parseArgs(["retry-cap", "--repeat", "5", "--delay", "2000", "jitter"])).toEqual({
      repeat: 5,
      delayMs: 2000,
      only: ["retry-cap", "jitter"],
    });
    expect(parseArgs([])).toEqual({ repeat: 1, delayMs: 0, only: [] });
  });
});
