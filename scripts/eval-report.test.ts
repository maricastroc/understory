import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Outcome } from "./eval-check";
import {
  type RunRecord,
  caseRows,
  caseStatus,
  groupRows,
  parseRecords,
  renderReport,
  summaryLines,
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

describe("the results published in eval/README.md", () => {
  it("are the tables and the total eval:report prints for the run they link", () => {
    const readme = readFileSync("eval/README.md", "utf8");
    const results = /\(results\/([\w.-]+\.jsonl)\)/.exec(readme)?.[1];
    const review = /\(results\/([\w.-]+\.review\.json)\)/.exec(readme)?.[1];
    expect(results).toBeDefined();
    expect(review).toBeDefined();
    const { meta, runs } = parseRecords(readFileSync(`eval/results/${results}`, "utf8"));
    const adjudication = JSON.parse(readFileSync(`eval/results/${review}`, "utf8"));
    const squeeze = (line: string) => line.replace(/-{3,}/g, "---").replace(/\s+/g, " ").trim();
    const published = new Set(readme.split("\n").map(squeeze));
    const printed = renderReport(meta, runs, adjudication).split("| Case |")[0].split("\n");
    const expected = printed.filter(
      (line) => line.startsWith("|") || line.includes("passed every run"),
    );
    expect(expected.length).toBeGreaterThan(15);
    for (const line of expected) expect(published).toContain(squeeze(line));
  });
});
