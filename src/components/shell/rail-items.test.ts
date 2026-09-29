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

  it("titles a case asked with a general question by its lines and file", () => {
    const at = (question: string, startLine: number, endLine: number) => {
      const base = syntheticCases[0];
      const evidence = {
        ...base.result.evidence,
        question,
        location: { file: "src/billing/charge.ts", startLine, endLine },
      };
      return { ...base, form: { ...base.form, question }, result: { ...base.result, evidence } };
    };
    const [line, range, specific] = lineRailItems(
      [
        at("Why is this line the way it is?", 9, 9),
        { ...at("Why are these lines the way they are?", 8, 12), caseId: "GI-3001" },
        { ...at("Why exactly 3 retries?", 9, 9), caseId: "GI-3002" },
      ],
      { activeId: null, now },
    );
    expect(line.title).toBe("Line 9 of charge.ts");
    expect(range.title).toBe("Lines 8–12 of charge.ts");
    expect(specific.title).toBe("Why exactly 3 retries?");
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
