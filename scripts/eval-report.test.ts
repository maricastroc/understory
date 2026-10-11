import { readFileSync } from "node:fs";
import type { VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import type { Outcome } from "./eval-check";
import {
  type MetaRecord,
  type RunRecord,
  auditCounts,
  caseRows,
  caseStatus,
  groupRows,
  parseRecords,
  renderReport,
  reviewProblems,
  scopeLabels,
  summaryLines,
  totalLines,
  verdictOf,
  wilson,
} from "./eval-report";

const run = (id: string, pass: number, outcome: Outcome, category = "recorded"): RunRecord => ({
  type: "run",
  id,
  set: "v2",
  category,
  source: "synthetic",
  pass,
  ms: 10,
  outcome,
  artifacts: [],
  narrative: null,
});

const PASS: Outcome = { kind: "pass", answerable: true };
const FAIL: Outcome = { kind: "fail", answerable: true, fails: ["recorded true ≠ false"] };
const REVIEW: Outcome = { kind: "review", answerable: true };
const ERROR: Outcome = { kind: "error", message: "rate-limited" };

describe("verdictOf", () => {
  it("takes a reviewed run's verdict from the adjudication and leaves it pending without one", () => {
    const reviewed = run("fp", 0, REVIEW);
    expect(verdictOf(reviewed)).toBe("pending");
    expect(verdictOf(reviewed, { "fp#0": { verdict: "fail", note: "affirms the premise" } })).toBe(
      "fail",
    );
    expect(verdictOf(run("a", 0, PASS), { "a#0": { verdict: "fail", note: "ignored" } })).toBe(
      "pass",
    );
  });
});

describe("caseStatus", () => {
  it("separates a stable pass, a stable fail and a case that changes between runs", () => {
    expect(caseStatus(["pass", "pass"])).toBe("pass");
    expect(caseStatus(["fail", "fail"])).toBe("fail");
    expect(caseStatus(["pass", "fail"])).toBe("unstable");
  });

  it("scores around errored runs and reports a case with nothing scored as errored", () => {
    expect(caseStatus(["pass", "error"])).toBe("pass");
    expect(caseStatus(["error", "error"])).toBe("errored");
    expect(caseStatus(["pass", "pending"])).toBe("pending");
  });
});

describe("wilson", () => {
  it("gives the interval a small sample deserves", () => {
    const [low, high] = wilson(7, 8);
    expect(low).toBeCloseTo(0.529, 2);
    expect(high).toBeCloseTo(0.978, 2);
  });

  it("stays inside 0 and 1 at the edges", () => {
    expect(wilson(0, 0)).toEqual([0, 1]);
    expect(wilson(8, 8)[1]).toBe(1);
    expect(wilson(0, 8)[0]).toBe(0);
  });
});

describe("caseRows and groupRows", () => {
  const runs = [
    run("a", 0, PASS),
    run("a", 1, PASS),
    run("b", 1, FAIL, "silent"),
    run("b", 0, PASS, "silent"),
    run("c", 0, REVIEW, "false-premise"),
    run("c", 1, ERROR, "false-premise"),
  ];
  const adjudication = { "c#0": { verdict: "fail" as const, note: "affirms the premise" } };

  it("orders each case's runs and carries the reason a run failed", () => {
    const rows = caseRows(runs, adjudication);
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      ["a", "pass"],
      ["b", "unstable"],
      ["c", "fail"],
    ]);
    expect(rows[1].verdicts).toEqual(["pass", "fail"]);
    expect(rows[1].notes).toEqual(["recorded true ≠ false"]);
    expect(rows[2].manual).toBe(true);
    expect(rows[2].notes).toEqual(["affirms the premise", "rate-limited"]);
  });

  it("counts cases and runs per group, leaving errored runs out of the scored ones", () => {
    const groups = groupRows(caseRows(runs, adjudication), (r) => r.category);
    expect(groups.find((g) => g.name === "false-premise")).toMatchObject({
      cases: 1,
      fail: 1,
      runsPassed: 0,
      runsScored: 1,
      runsErrored: 1,
    });
    expect(groups.find((g) => g.name === "silent")).toMatchObject({ unstable: 1, runsScored: 2 });
  });
});

describe("summaryLines", () => {
  it("gives one line per category, with cases held for review named apart", () => {
    const lines = summaryLines([
      run("a", 0, PASS),
      run("a", 1, PASS),
      run("b", 0, PASS, "silent"),
      run("b", 1, FAIL, "silent"),
      run("c", 0, REVIEW, "false-premise"),
      run("d", 0, ERROR, "false-premise"),
    ]);
    expect(lines).toEqual([
      "recorded       1 case · 1 passed every run · 0 unstable · 0 failed every run",
      "silent         1 case · 0 passed every run · 1 unstable · 0 failed every run",
      "false-premise  2 cases · 0 passed every run · 0 unstable · 0 failed every run · 1 awaiting manual review · 1 errored",
    ]);
  });
});

describe("parseRecords and renderReport", () => {
  it("reads a results file back and reports how many cases passed every run", () => {
    const meta = {
      type: "meta",
      date: "2026-10-11T12:00:00.000Z",
      commit: "abc1234",
      synthesis: "synth",
      audit: "judge",
      repeat: 2,
      delayMs: 0,
      cases: 2,
    };
    const text = [meta, run("a", 0, PASS), run("a", 1, PASS), run("b", 0, FAIL), run("b", 1, FAIL)]
      .map((r) => JSON.stringify(r))
      .join("\n");
    const parsed = parseRecords(`${text}\n`);
    expect(parsed.meta?.commit).toBe("abc1234");
    expect(parsed.runs).toHaveLength(4);
    const report = renderReport(parsed.meta, parsed.runs);
    expect(report).toContain("2026-10-11 · commit abc1234");
    expect(report).toContain("1 of 2 cases passed every run. That is a count over this set");
    expect(report).toContain("| `b` | v2 | recorded | synthetic | ✗ ✗ |");
  });
});

const META: MetaRecord = {
  type: "meta",
  date: "2026-10-11T12:00:00.000Z",
  commit: "abc1234",
  synthesis: "synth",
  audit: "judge",
  repeat: 2,
  delayMs: 0,
  cases: 2,
};

const answer = (over: Partial<VerifiedNarrative>): VerifiedNarrative => ({
  answer: "",
  claims: [],
  citations: [],
  recorded: false,
  answerable: true,
  grounded: true,
  unknownCitations: [],
  ungroundedClaims: 0,
  confidence: { score: 0.3, level: "low", primarySources: 0, corroborating: 0, contradicting: 0 },
  ...over,
});

describe("reviewProblems", () => {
  const runs = [run("held", 0, REVIEW), run("plain", 0, PASS)];
  const ruling = { verdict: "pass" as const, note: "abstains" };

  it("accepts a review made for this run that only rules on held runs", () => {
    expect(reviewProblems(META, runs, { run: META.date, verdicts: { "held#0": ruling } })).toEqual(
      [],
    );
  });

  it("refuses a review written for another run", () => {
    const problems = reviewProblems(META, runs, { run: "2026-01-01T00:00:00.000Z", verdicts: {} });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("the review is for the run of 2026-01-01T00:00:00.000Z");
  });

  it("names a verdict for a run that is missing, was not held, or is not pass or fail", () => {
    const loose = { verdict: "Pass", note: "" } as unknown as typeof ruling;
    expect(
      reviewProblems(META, runs, {
        run: META.date,
        verdicts: { "gone#0": ruling, "plain#0": ruling, "held#0": loose },
      }),
    ).toEqual([
      "a verdict for gone#0, which is not in these results",
      "a verdict for plain#0, which was not held for review",
      'the verdict for held#0 is "Pass", expected "pass" or "fail"',
    ]);
  });
});

describe("what the report says beyond pass and fail", () => {
  it("counts out-of-scope runs by their label and by whether they made a claim", () => {
    const oos = (pass: number, narrative: VerifiedNarrative): RunRecord => ({
      ...run("oos", pass, PASS, "out-of-scope"),
      narrative,
    });
    const claim = { text: "It is Paris.", citations: [], grounded: false };
    expect(
      scopeLabels([
        oos(0, answer({ answerable: false })),
        oos(1, answer({})),
        oos(2, answer({ claims: [claim] })),
        run("other", 0, PASS),
      ]),
    ).toEqual({ runs: 3, refused: 1, silent: 2 });
  });

  it("counts claim audits, the ones the fallback model answered and the ones that failed", () => {
    const check = (claim: number) => ({
      citation: "commit:a",
      claim,
      status: "supported" as const,
      quote: null,
      reason: "",
    });
    const audited: RunRecord = {
      ...run("a", 0, PASS),
      narrative: answer({
        entailment: {
          checked: true,
          checks: [check(0), check(0), check(1)],
          supported: 2,
          misattributed: 0,
          failed: 1,
          fallbacks: 1,
        },
      }),
    };
    expect(auditCounts([audited, run("b", 0, PASS)])).toEqual({
      audits: 3,
      fallbacks: 1,
      failed: 1,
    });
  });

  it("says how many cases are still held instead of counting them as not passed", () => {
    const runs = [run("a", 0, PASS), run("held", 0, REVIEW, "false-premise")];
    expect(totalLines(runs)[0]).toBe(
      "1 of 2 cases are held for a manual verdict and counted in no other column. Pass the review file to settle them.",
    );
    const report = renderReport(META, runs);
    expect(report).toContain("| false-premise | 1 | 0 | 0 | 0 | 1 | 0/0 | 0 |");
    expect(report).not.toContain("passed every run. That is a count");
  });

  it("keeps a failure note with a pipe inside its table cell", () => {
    const failed: Outcome = {
      kind: "fail",
      answerable: true,
      fails: ["no cited source matches /INC-1187|cap/"],
    };
    const row = renderReport(META, [run("a", 0, failed)])
      .split("\n")
      .find((line) => line.startsWith("| `a`"));
    expect(row).toContain("/INC-1187\\|cap/");
    expect(row?.replaceAll("\\|", "").split("|")).toHaveLength(9);
  });

  it("reports the passes that were run when a run was cut short", () => {
    expect(renderReport(META, [run("a", 0, PASS)])).toContain("· 1 of 2 passes");
    expect(renderReport(META, [run("a", 0, PASS), run("a", 1, PASS)])).toContain("· 2 passes");
  });
});

describe("the results published in eval/README.md", () => {
  it("are the tables and the totals eval:report prints for the run they link", () => {
    const readme = readFileSync("eval/README.md", "utf8");
    const results = /\(results\/([\w.-]+\.jsonl)\)/.exec(readme)?.[1];
    const reviewed = /\(results\/([\w.-]+\.review\.json)\)/.exec(readme)?.[1];
    expect(results).toBeDefined();
    expect(reviewed).toBeDefined();
    const { meta, runs } = parseRecords(readFileSync(`eval/results/${results}`, "utf8"));
    const review = JSON.parse(readFileSync(`eval/results/${reviewed}`, "utf8"));
    expect(reviewProblems(meta, runs, review)).toEqual([]);
    const squeeze = (line: string) => line.replace(/-{3,}/g, "---").replace(/\s+/g, " ").trim();
    const published = new Set(readme.split("\n").map(squeeze));
    const tables = renderReport(meta, runs, review.verdicts)
      .split("| Case |")[0]
      .split("\n")
      .filter((line) => line.startsWith("|"));
    const expected = [...tables, ...totalLines(runs, review.verdicts)];
    expect(tables.length).toBeGreaterThan(15);
    for (const line of expected) expect(published).toContain(squeeze(line));
  });

  it("is backed by a written read that belongs to the same run", () => {
    const readme = readFileSync("eval/README.md", "utf8");
    const results = /\(results\/([\w.-]+\.jsonl)\)/.exec(readme)?.[1];
    const reading = /\(results\/([\w.-]+\.reading\.json)\)/.exec(readme)?.[1];
    expect(reading).toBeDefined();
    const { meta, runs } = parseRecords(readFileSync(`eval/results/${results}`, "utf8"));
    const read = JSON.parse(readFileSync(`eval/results/${reading}`, "utf8"));
    const claimed = new Set(
      runs.filter((r) => (r.narrative?.claims.length ?? 0) > 0).map((r) => `${r.id}#${r.pass}`),
    );
    expect(read.run).toBe(meta?.date);
    expect(read.runsRead).toBe(claimed.size);
    for (const key of [...Object.keys(read.unsupported), ...Object.keys(read.borderline)])
      expect(claimed).toContain(key);
  });
});
