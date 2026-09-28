import type { DiffResult } from "@git-investigator/core/diff/types";
import { describe, expect, it } from "vitest";
import { SYNTHETIC_PR_NOW, syntheticPr944 } from "../fixtures/synthetic-pr-944";
import {
  syntheticPrAllSilent,
  syntheticPrEvidenceOnly,
  syntheticPrLegacy,
  syntheticPrTruncated,
} from "../fixtures/synthetic-pr-states";
import { buildPrView } from "./build-pr-view";

const now = Date.parse(SYNTHETIC_PR_NOW);
const view = (result: DiffResult = syntheticPr944) => buildPrView(result, { now });
const byId = (v: ReturnType<typeof view>, id: string) => v.regions.find((r) => r.id === id)!;

describe("regions are concrete path + line intervals", () => {
  const v = view();

  it("turns every distinct target into its own region, even inside one finding", () => {
    expect(v.regions.map((r) => `${r.path}:${r.range.start}-${r.range.end}`)).toEqual([
      "webhooks/legacy.ts:1-88",
      "webhooks/router.ts:14-22",
      "webhooks/router.ts:60-71",
      "webhooks/verify.ts:40-52",
      "billing/charge.ts:30-34",
      "config/flags.ts:8-8",
      "docs/webhooks.md:20-41",
      "tests/webhooks.spec.ts:112-160",
    ]);
    expect(byId(v, "R2").findings).toEqual([0]);
    expect(byId(v, "R3").findings).toEqual([0]);
  });

  it("lets regions from one origin commit share its provenance without duplicating it", () => {
    const shared = ["R2", "R3", "R4"].map((id) => byId(v, id).artifactIds);
    expect(shared[0]).toEqual(shared[1]);
    expect(shared[1]).toEqual(shared[2]);
    expect(v.artifacts.filter((a) => a.id === "pr:1020")).toHaveLength(1);
    expect(v.regionsOf.get("pr:1020")).toEqual(["R1", "R2", "R3", "R4"]);
  });

  it("links an interval blamed to two commits to both findings, and only that region gets the older history", () => {
    expect(byId(v, "R1").findings).toEqual([0, 3]);
    expect(byId(v, "R1").artifactIds).toEqual(expect.arrayContaining(["pr:201", "issue:140"]));
    for (const id of ["R2", "R3", "R4"]) {
      expect(byId(v, id).artifactIds).not.toContain("pr:201");
    }
  });

  it("keeps shared-PR regions contiguous and numbers regions in display order", () => {
    expect(v.regions.slice(0, 4).every((r) => r.group === 0)).toBe(true);
    expect(v.regions.map((r) => r.id)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]);
  });

  it("only counts fully explained regions", () => {
    expect(v.explained).toBe(6);
    expect(v.regions.filter((r) => r.state === "silent").map((r) => r.id)).toEqual(["R5", "R8"]);
  });

  it("marks a region partial when only some of its origin commits are recorded", () => {
    const result: DiffResult = {
      ...syntheticPr944,
      findings: syntheticPr944.findings.map((f, i) => (i === 3 ? { ...f, recorded: false } : f)),
    };
    const p = view(result);
    expect(byId(p, "R1").state).toBe("partial");
    expect(p.explained).toBe(5);
    expect(p.coverage).toContainEqual({ kind: "partial", region: "R1", explained: 1, total: 2 });
  });
});

describe("clauses, letters and gaps", () => {
  const v = view();

  it("maps summary clauses to the regions whose evidence they cite", () => {
    expect(v.clauses.map((c) => c.regions)).toEqual([
      ["R1", "R2", "R3", "R4"],
      ["R6", "R7"],
      ["R5", "R8"],
    ]);
  });

  it("states silent regions in a system clause, never as model text", () => {
    const silent = v.clauses.at(-1)!;
    expect(silent).toMatchObject({ silent: true, derived: true, citations: [] });
    expect(silent.text).toBe("Why R5 and R8 exist is not recorded");
  });

  it("letters every artifact once, by depth across the whole PR", () => {
    expect(v.artifacts.map((a) => a.letter).join("")).toBe("ABCDEFGHIJKLMN");
    expect(v.artifacts[0].id).toBe("commit:3f0a9d1");
    expect(v.artifacts.at(-1)!.id).toBe("issue:140");
  });

  it("measures depth from the PR opening, not from today", () => {
    expect(v.datum.label).toBe("head");
    const docs = v.artifacts.find((a) => a.id === "commit:3f0a9d1")!;
    expect(Math.round(docs.daysBeforeNow!)).toBe(153);
  });

  it("draws a gap under each silent region, and says 'no PR' only when the lookup said none", () => {
    expect(v.gaps.map((g) => [g.afterId, g.missing, g.basis])).toEqual([
      ["commit:0d93b6f", "pull_request", "searched"],
      ["commit:5ad77e0", "pull_request", "searched"],
    ]);
    const withPr: DiffResult = {
      ...syntheticPr944,
      findings: syntheticPr944.findings.map((f, i) => (i === 1 ? { ...f, recorded: false } : f)),
    };
    const gap = view(withPr).gaps.find((g) => g.afterId === "pr:1101");
    expect(gap).toMatchObject({ missing: "reason", basis: "silent" });
  });
});

describe("coverage and states", () => {
  it("summarises coverage from the record", () => {
    const v = view();
    expect(v.coverage).toEqual([
      { kind: "regions", explained: 6, total: 8 },
      { kind: "silent", regions: ["R5", "R8"], directCommits: true },
      { kind: "citations", resolved: 9, total: 9, unknown: [], misattributed: 0 },
      { kind: "quotes", verified: 9 },
    ]);
    expect(v.upstream).toEqual({ commits: 6, prs: 4, issues: 2, reviews: 2 });
    expect(v.confidence).toMatchObject({ lowest: "medium", highest: "high" });
    expect(v.confidence!.score).toBeGreaterThan(0.8);
  });

  it("says when every region is silent, with one system clause and no confidence", () => {
    const v = view(syntheticPrAllSilent());
    expect(v.explained).toBe(0);
    expect(v.clauses).toHaveLength(1);
    expect(v.clauses[0].text).toBe("Why these regions exist is not recorded");
    expect(v.confidence).toBeNull();
  });

  it("shows only evidence when the synthesis failed: no clauses, no gaps, nothing called silent", () => {
    const v = view(syntheticPrEvidenceOnly());
    expect(v.mode).toBe("evidence-only");
    expect(v.clauses).toEqual([]);
    expect(v.gaps).toEqual([]);
    expect(v.regions.every((r) => r.state === "unexplained")).toBe(true);
    expect(v.coverage[0]).toMatchObject({ kind: "evidence-only" });
  });

  it("is explicit about a truncated triage", () => {
    expect(view(syntheticPrTruncated()).coverage).toContainEqual({
      kind: "truncated",
      investigated: 8,
      blamed: 23,
    });
  });

  it("reads cases saved before PR dates and hunks were stored", () => {
    const v = view(syntheticPrLegacy());
    expect(v.datum).toEqual({ time: now, label: "today" });
    expect(v.added).toBeNull();
    expect(v.regions.every((r) => r.hunk === null)).toBe(true);
    expect(view().added).toBe(4);
  });
});
