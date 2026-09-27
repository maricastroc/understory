import { describe, expect, it } from "vitest";
import type { RailItem } from "./types";
import { syntheticCases, syntheticPrCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { syntheticWithoutStageFourData } from "../line-investigation/fixtures/synthetic-states";
import { filterRail, lineRailItems, prRailItems } from "./rail-items";

const now = Date.parse(SYNTHETIC_NOW);
const lines = lineRailItems(syntheticCases, { activeId: "GI-2049", now });

describe("lineRailItems", () => {
  it("derives status and subline from each case's evidence", () => {
    expect(lines.map((i) => [i.title, i.subline, i.status, i.child])).toEqual([
      ["Why exactly 3 retries?", "charge.ts:9 · 5 of 6 links", "resolved", false],
      ["Which alternatives did review reject?", "from B · review·dmitri-k", "resolved", true],
      ["Why is the idempotency key req.id?", "charge.ts:11 · 2 of 4 links", "resolved", false],
      ["Why are 4xx errors never retried?", "charge.ts:13 · not recorded", "silent", false],
      ["Why does refund skip the ledger?", "refund.ts:42 · evidence only", "evidence-only", false],
    ]);
    expect(lines.filter((i) => i.current).map((i) => i.id)).toEqual(["GI-2049"]);
  });

  it("places children right under their parent regardless of recency", () => {
    const reordered = [syntheticCases[2], syntheticCases[1], syntheticCases[0]];
    expect(lineRailItems(reordered, { activeId: null, now }).map((i) => i.id)).toEqual([
      "GI-2050",
      "GI-2049",
      "GI-2054",
    ]);
  });

  it("shows an orphaned child at the top level with its anchor", () => {
    const orphan = lineRailItems([syntheticCases[1]], { activeId: null, now });
    expect(orphan[0]).toMatchObject({ child: false, subline: "#812" });
  });

  it("does not claim N of M links when a gap was not verified", () => {
    const [item] = lineRailItems(
      [{ ...syntheticCases[0], result: syntheticWithoutStageFourData() }],
      { activeId: null, now },
    );
    expect(item.subline).toBe("charge.ts:9 · 5 links");
  });

  it("marks pending cases", () => {
    const [item] = lineRailItems([{ ...syntheticCases[0], pending: true }], {
      activeId: null,
      now,
    });
    expect([item.status, item.subline]).toEqual(["pending", "charge.ts:9 · reconstructing…"]);
  });
});

describe("prRailItems and filter", () => {
  const prs = prRailItems(syntheticPrCases, null);

  it("summarises a PR by its explained regions", () => {
    expect(prs[0]).toMatchObject({
      title: "Drop legacy webhook path",
      subline: "#944 · 3 of 8 regions",
      status: "pr",
    });
  });

  it("counts regions the way the pull request page does: explained of detailed", () => {
    const result = syntheticPrCases[0].result;
    const capped = { ...result, triage: { ...result.triage, clustersFound: 12 } };
    expect(prRailItems([{ key: "k", result: capped }], null)[0].subline).toBe(
      "#944 · 3 of 8 regions",
    );
    const unexplained = {
      ...result,
      findings: result.findings.map((f) => ({ ...f, grounded: false })),
    };
    expect(prRailItems([{ key: "k", result: unexplained }], null)[0].subline).toBe(
      "#944 · 0 of 8 regions",
    );
  });

  it("filters lines, PRs or both", () => {
    expect(filterRail(lines, prs, "all")).toHaveLength(6);
    expect(filterRail(lines, prs, "lines")).toHaveLength(5);
    expect(filterRail(lines, prs, "prs")).toHaveLength(1);
  });

  it("nests a drill-down opened from a pull request under that pull request", () => {
    const child: RailItem = {
      id: "GI-3001",
      kind: "line",
      title: "Why was this pull request opened?",
      subline: "#1020",
      status: "resolved",
      child: false,
      current: false,
      parentId: prs[0].id,
    };
    const all = filterRail([...lines, child], prs, "all");
    const at = all.findIndex((i) => i.id === prs[0].id);
    expect(all[at + 1]).toMatchObject({ id: "GI-3001", child: true });
    expect(filterRail([...lines, child], prs, "lines").at(-1)).toMatchObject({ child: false });
  });
});
