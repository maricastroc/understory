import { describe, expect, it } from "vitest";
import { TOOL_CALL_ERROR, failingJudge, scriptedJudge } from "../testing/scripted-judge";
import type { Artifact } from "../types";
import { checkDiffEntailment, diffEntailmentAffordable, failedAuditChecks } from "./entail";
import { auditFailureNote } from "./investigate";
import type { DiffCluster, DiffCollection, DiffNarrative } from "./types";
import { verifyDiff } from "./verify";

const artifact = (id: string): Artifact =>
  ({ id, kind: "commit", date: "2026-01-01", body: "x" }) as unknown as Artifact;

const cluster = (n: number): DiffCluster =>
  ({
    targets: [],
    artifacts: Array.from({ length: n }, (_, i) => artifact(`a${i}`)),
  }) as unknown as DiffCluster;

describe("diffEntailmentAffordable", () => {
  it("allows a small pull request", () => {
    expect(diffEntailmentAffordable([cluster(2), cluster(2)])).toBe(true);
  });

  it("skips when there are too many clusters", () => {
    expect(diffEntailmentAffordable(Array.from({ length: 8 }, () => cluster(1)))).toBe(false);
  });

  it("skips when the total artifact count is too high", () => {
    expect(diffEntailmentAffordable([cluster(7), cluster(7)])).toBe(false);
  });
});

const source = (id: string, kind: Artifact["kind"], body: string): Artifact => ({
  id,
  kind,
  title: id,
  body,
  url: "",
  date: "2021-02-01T00:00:00Z",
});

const region = (artifacts: Artifact[]): DiffCluster => ({
  commitId: artifacts[0].id,
  targets: [{ path: "lib/application.js", range: { start: 171, end: 172 } }],
  artifacts,
  contradictions: [],
  rank: 0,
});

const pull = (clusters: DiffCluster[]): DiffCollection => ({
  repo: { path: "expressjs/express", name: "express" },
  pr: { number: 6081, title: "t", url: "u", baseSha: "b", headSha: "h" },
  clusters,
  triage: {
    filesChanged: 1,
    filesConsidered: 1,
    filesSkipped: 0,
    targetsBlamed: clusters.length,
    clustersFound: clusters.length,
    clustersDetailed: clusters.length,
    truncated: false,
  },
});

const PR_4011_BODY =
  "deps: setprototypeof@1.2.0\n\nUpdate setprototypeof.  No impact here, but includes a fix for a possible prototype pollution in the fallback.  Can be ported to `5.x` as well.\n\n— discussion —\n@wesleytodd: To be very clear, this is not a security update.  There are no uses of this module in express which allow for a prototype pollution.  The update changes `obj.hasOwnProperty(prop)`, which if used on untrusted user input  can result in a prototype polution.  **Express does not use this module on untrusted user input**.";

const POLYFILL = source("commit:c319fe2", "commit", "4.15.4");
const RELEASE_5 = source("pr:2237", "pull_request", "Release 5.0 — move all code into pillarjs.");
const BUMP = source("commit:cbe25d6", "commit", "deps: setprototypeof@1.2.0");
const DEPS_PR = source("pr:4011", "pull_request", PR_4011_BODY);
const TYPO = source("commit:c087a45", "commit", "Fix typo in setPrototypeOf polyfill");

const weak = { status: "weak", quote: "", reason: "on topic" };

describe("checkDiffEntailment + verifyDiff — commit ids without the 'commit:' prefix (express#6081)", () => {
  const col = pull([region([POLYFILL, RELEASE_5]), region([BUMP, DEPS_PR]), region([TYPO])]);
  const narrative: DiffNarrative = {
    summaryClaims: [
      { text: "The polyfill persisted through the 4.x series.", citations: ["c319fe2", "c087a45"] },
    ],
    findings: [
      { cluster: "C1", why: "polyfill shipped", citations: ["c319fe2", "pr:2237"], recorded: true },
      { cluster: "C2", why: "shim bumped", citations: ["cbe25d6", "pr:4011"], recorded: true },
      { cluster: "C3", why: "typo fixed", citations: ["c087a45"], recorded: true },
    ],
  };

  it("audits the commits the model cited by bare sha", async () => {
    const judged: string[] = [];
    const judge = scriptedJudge((prompt) => {
      judged.push(prompt);
      return weak;
    });
    await checkDiffEntailment(col.clusters, narrative, { primary: judge, fallback: null });
    for (const id of ["commit:c319fe2", "commit:cbe25d6", "commit:c087a45"]) {
      expect(judged.some((p) => p.includes(`[${id}]`))).toBe(true);
    }
  });

  it("grounds every region and the summary once the bare shas resolve", async () => {
    const e = await checkDiffEntailment(col.clusters, narrative, {
      primary: scriptedJudge(() => weak),
      fallback: null,
    });
    const res = verifyDiff(col, narrative, e.byRef, e.summary);
    expect(res.findings.map((f) => f.grounded)).toEqual([true, true, true]);
    expect(res.findings.map((f) => f.unknownCitations)).toEqual([[], [], []]);
    expect(res.findings[0].citations).toEqual(["commit:c319fe2", "pr:2237"]);
    expect(res.findings.every((f) => f.confidence.level !== "low")).toBe(true);
    expect(res.summaryClaims[0]).toMatchObject({
      citations: ["commit:c319fe2", "commit:c087a45"],
      grounded: true,
    });
  });

  it("neither audits nor grounds a sha that names no collected commit", async () => {
    const invented: DiffNarrative = {
      summaryClaims: [],
      findings: [
        { cluster: "C1", why: "polyfill shipped", citations: ["deadbee"], recorded: true },
      ],
    };
    const judge = scriptedJudge(() => weak);
    const e = await checkDiffEntailment(col.clusters, invented, { primary: judge, fallback: null });
    expect(judge.doGenerateCalls).toHaveLength(0);
    const res = verifyDiff(col, invented, e.byRef, e.summary);
    expect(res.findings[0]).toMatchObject({ grounded: false, unknownCitations: ["deadbee"] });
    expect(res.findings[0].confidence).toMatchObject({ level: "low", score: 0.2 });
  });

  it("does not resolve a sha shared by two collected commits", async () => {
    const twins = pull([
      region([
        source("commit:abc1234aa", "commit", "a"),
        source("commit:abc1234bb", "commit", "b"),
      ]),
    ]);
    const ambiguous: DiffNarrative = {
      summaryClaims: [],
      findings: [{ cluster: "C1", why: "which one", citations: ["abc1234"], recorded: true }],
    };
    const judge = scriptedJudge(() => weak);
    const e = await checkDiffEntailment(twins.clusters, ambiguous, {
      primary: judge,
      fallback: null,
    });
    expect(judge.doGenerateCalls).toHaveLength(0);
    const res = verifyDiff(twins, ambiguous, e.byRef, e.summary);
    expect(res.findings[0]).toMatchObject({ grounded: false, unknownCitations: ["abc1234"] });
  });
});

describe("regression P2 — region confidence when the judge's quote cannot be verified", () => {
  it("keeps a region citing only pr:4011 at medium instead of dropping it to low as a misattribution", async () => {
    const col = pull([region([BUMP, DEPS_PR])]);
    const narrative: DiffNarrative = {
      summaryClaims: [],
      findings: [
        {
          cluster: "C1",
          why: "The setprototypeof bump brought an upstream prototype-pollution fix, and the PR discussion clarified it was not a security update for Express.",
          citations: ["pr:4011"],
          recorded: true,
        },
      ],
    };
    const abbreviated = PR_4011_BODY.replace(" in a prototype polution.  ", "... ");
    const e = await checkDiffEntailment(col.clusters, narrative, {
      primary: scriptedJudge(() => ({ status: "supported", quote: abbreviated, reason: "stated" })),
      fallback: null,
    });
    expect(e.byRef.get("C1")).toMatchObject({ checked: true, supported: 0, misattributed: 0 });
    expect(e.byRef.get("C1")?.checks[0]).toMatchObject({ status: "weak", quote: null });

    const res = verifyDiff(col, narrative, e.byRef, e.summary);
    expect(res.findings[0].confidence).toMatchObject({ level: "medium", score: 0.55 });
  });
});

describe("checkDiffEntailment — hybrid auditor", () => {
  const col = pull([region([BUMP, DEPS_PR])]);
  const narrative: DiffNarrative = {
    summaryClaims: [{ text: "Express bumped the shim.", citations: ["pr:4011"] }],
    findings: [{ cluster: "C1", why: "shim bumped", citations: ["pr:4011"], recorded: true }],
  };
  const supported = {
    status: "supported",
    quote: "includes a fix for a possible prototype pollution in the fallback",
    reason: "stated",
  };

  it("falls back per citation and records it on the region", async () => {
    const fallback = scriptedJudge(() => supported);
    const e = await checkDiffEntailment(col.clusters, narrative, {
      primary: failingJudge(),
      fallback,
    });
    expect(e.byRef.get("C1")).toMatchObject({
      checked: true,
      supported: 1,
      fallbacks: 1,
      failed: 0,
    });
    expect(e.summary).toMatchObject({ checked: true, fallbacks: 1 });
    expect(failedAuditChecks(e.byRef, e.summary)).toBe(0);
  });

  it("keeps a region whose every check failed, marked unaudited with the failure counted", async () => {
    const e = await checkDiffEntailment(col.clusters, narrative, {
      primary: failingJudge(),
      fallback: failingJudge(),
    });
    expect(e.byRef.get("C1")).toMatchObject({ checked: false, checks: [], failed: 1 });
    expect(failedAuditChecks(e.byRef, e.summary)).toBe(2);

    const res = verifyDiff(col, narrative, e.byRef, e.summary);
    expect(res.findings[0].entailment).toMatchObject({ checked: false, failed: 1 });
    expect(res.findings[0].confidence).toMatchObject({ level: "medium", score: 0.5 });
    expect(res.summaryEntailment).toMatchObject({ checked: false, failed: 1 });
  });

  it("only counts the checks that actually failed", async () => {
    const primary = scriptedJudge((prompt) =>
      prompt.includes("Answer under review") ? new Error(TOOL_CALL_ERROR) : supported,
    );
    const e = await checkDiffEntailment(col.clusters, narrative, { primary, fallback: null });
    expect(e.byRef.get("C1")).toMatchObject({ checked: false, failed: 1 });
    expect(e.summary).toMatchObject({ checked: true, failed: 0 });
    expect(failedAuditChecks(e.byRef, e.summary)).toBe(1);
  });
});

describe("auditFailureNote", () => {
  it("says how many checks could not run", () => {
    expect(auditFailureNote(1)).toBe(
      "1 citation check could not run, so it is shown as unaudited.",
    );
    expect(auditFailureNote(3)).toBe(
      "3 citation checks could not run, so they are shown as unaudited.",
    );
  });
});
