import { describe, expect, it } from "vitest";
import { datumToken } from "../../../line-investigation/specimen/datum-token";
import { LANDING_NOW, landingLines, landingVersions, landingView } from "../landing-fixture";
import { pastValue } from "./past-value";
import { strataLayout, strataTrace } from "./strata-layout";
import { STRATA_FRAME, STRATA_STACKED, STRATA_WIDE } from "./strata-metrics";

const wide = strataLayout(landingView, landingVersions, LANDING_NOW, STRATA_WIDE);
const node = (id: string) => wide.strata.find((s) => s.artifact.id === id)!.node;

describe("strataLayout", () => {
  it("lays the history newest first, with reviews as one dashed sub-layer", () => {
    expect(wide.strata.map((s) => s.artifact.letter)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(wide.strata.map((s) => s.rule)).toEqual([
      "solid",
      "dashed",
      null,
      "solid",
      "solid",
      "solid",
    ]);
    const tops = wide.strata.map((s) => s.top);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    for (const [i, s] of wide.strata.entries()) {
      if (i > 0) expect(s.top).toBeGreaterThanOrEqual(wide.strata[i - 1].bottom);
    }
  });

  it("breaks for the unchanged years, and draws silence only where a verified gap sits", () => {
    expect(wide.breaks.map((b) => b.kind)).toEqual(["unchanged", "silent"]);
    const [unchanged, silent] = wide.breaks;
    expect(unchanged.top).toBe(STRATA_WIDE.datumY + 3);
    expect(Math.round(unchanged.days)).toBe(1292);
    expect(silent.gap?.afterId).toBe("commit:7be210e");
    const f = wide.strata.at(-1)!;
    expect(silent.top).toBeGreaterThan(wide.strata.at(-2)!.bottom);
    expect(silent.bottom).toBeLessThan(f.top);

    const unverified = {
      ...landingView,
      gaps: landingView.gaps.map((g) => ({ ...g, verified: false })),
    };
    const layout = strataLayout(unverified, landingVersions, LANDING_NOW, STRATA_WIDE);
    expect(layout.breaks.map((b) => b.kind)).toEqual(["unchanged", "unchanged"]);
  });

  it("places each clause at the depth of the first artifact it cites", () => {
    expect(wide.clauses).toEqual([
      { id: "c0", anchor: node("commit:92f6a3f"), y: node("commit:92f6a3f") },
      { id: "c2", anchor: node("review:812-1"), y: node("review:812-1") },
      { id: "c1", anchor: node("issue:1187"), y: node("issue:1187") },
    ]);
  });

  it("keeps clauses apart when they would anchor on the same depth", () => {
    const shared = {
      ...landingView,
      clauses: landingView.clauses.map((c) => ({ ...c, citations: ["pr:812", ...c.citations] })),
    };
    const { clauses } = strataLayout(shared, landingVersions, LANDING_NOW, STRATA_WIDE);
    expect(new Set(clauses.map((c) => c.anchor)).size).toBe(1);
    for (let i = 1; i < clauses.length; i++) {
      expect(clauses[i].y - clauses[i - 1].y).toBeGreaterThanOrEqual(STRATA_WIDE.clause);
    }
  });

  it("traces a clause through every stratum it cites", () => {
    const clause = landingView.clauses.find((c) => c.id === "c1")!;
    expect(strataTrace(wide, clause)).toEqual({
      anchor: node("issue:1187"),
      stubs: [node("pr:812")],
      top: node("pr:812"),
      bottom: node("issue:1187"),
    });
  });

  it("puts each line version under its artifact and ends the bore under the oldest", () => {
    const pr = wide.strata.find((s) => s.artifact.id === "pr:812")!;
    const origin = wide.strata.at(-1)!;
    expect(pr.version?.note).toBe("first revision");
    expect(pr.versionY).toBeGreaterThan(pr.row);
    expect(pr.versionY! + STRATA_WIDE.code.line).toBeLessThanOrEqual(pr.bottom);
    expect(wide.origin).toBe(origin.versionY! + STRATA_WIDE.code.line + STRATA_WIDE.tail);
    expect(wide.strata.filter((s) => s.current).map((s) => s.artifact.id)).toEqual([
      "commit:92f6a3f",
    ]);
  });

  it("fits the wide drawing in the 1600×1000 frame", () => {
    expect(wide.bottom + STRATA_FRAME.footer).toBeLessThanOrEqual(STRATA_FRAME.height);
  });

  it("marks the stacked nodes on the date line, clear of the records", () => {
    const stacked = strataLayout(landingView, landingVersions, LANDING_NOW, STRATA_STACKED);
    for (const s of stacked.strata) expect(s.node).toBeLessThan(s.row);
  });
});

describe("pastValue", () => {
  const token = datumToken(landingView.question, landingLines[8])!;

  it("finds the older value in the token's column", () => {
    const text = landingVersions[0].text;
    expect(pastValue(text, token)).toEqual({ start: token.start, end: token.end });
    expect(pastValue("  for (let i = 0; attempt < 10; i++) {", { start: 28, end: 29 })).toEqual({
      start: 28,
      end: 30,
    });
  });

  it("reports nothing when the column is empty in that version", () => {
    expect(pastValue(landingVersions[1].text, token)).toBeNull();
    expect(pastValue("  for (x of  y) {", { start: 11, end: 12 })).toBeNull();
  });
});
