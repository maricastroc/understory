import { describe, expect, it } from "vitest";
import { syntheticCases } from "../line-investigation/fixtures/synthetic-cases";
import { SYNTHETIC_NOW } from "../line-investigation/fixtures/synthetic-retry-cap";
import { syntheticWithoutStageFourData } from "../line-investigation/fixtures/synthetic-states";
import { lineRailItems } from "./rail-items";

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
