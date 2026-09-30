import { describe, expect, it } from "vitest";
import { caseReducer, effectiveClause, initialCaseState } from "./case-reducer";
import type { CaseAction, CaseState } from "./types";

const run = (actions: CaseAction[], from: CaseState = initialCaseState()) =>
  actions.reduce(caseReducer, from);

describe("caseReducer — clauses", () => {
  it("previews on hover and returns to the pinned clause on leave", () => {
    const s = run([
      { type: "toggle-pin", id: "c1" },
      { type: "hover-clause", id: "c2" },
    ]);
    expect(effectiveClause(s)).toBe("c2");
    expect(effectiveClause(caseReducer(s, { type: "hover-clause", id: null }))).toBe("c1");
  });

  it("unpins by selecting the open clause again or by closing its evidence", () => {
    expect(
      run([
        { type: "toggle-pin", id: "c1" },
        { type: "toggle-pin", id: "c1" },
      ]).pinnedClause,
    ).toBeNull();
    expect(run([{ type: "toggle-pin", id: "c1" }, { type: "clear-pin" }]).pinnedClause).toBeNull();
    expect(
      run([
        { type: "toggle-pin", id: "c1" },
        { type: "toggle-pin", id: "c2" },
      ]).pinnedClause,
    ).toBe("c2");
  });
});

describe("caseReducer — evidence", () => {
  it("opens a clause on its first source and forgets the source when it closes", () => {
    const s = run([{ type: "toggle-pin", id: "c1" }]);
    expect([s.pinnedClause, s.source]).toEqual(["c1", null]);
    const shown = caseReducer(s, { type: "show-source", id: "D" });
    expect(shown.source).toBe("D");
    expect(caseReducer(shown, { type: "toggle-pin", id: "c2" })).toMatchObject({
      pinnedClause: "c2",
      source: null,
    });
    expect(caseReducer(shown, { type: "clear-pin" })).toMatchObject({
      pinnedClause: null,
      source: null,
    });
  });

  it("steps through the clause's own sources and stops at both ends", () => {
    const order = ["E", "D"];
    const first = run([{ type: "toggle-pin", id: "c1" }]);
    const next = caseReducer(first, { type: "step-source", order, delta: 1 });
    expect(next.source).toBe("D");
    expect(caseReducer(next, { type: "step-source", order, delta: 1 })).toBe(next);
    expect(caseReducer(next, { type: "step-source", order, delta: -1 }).source).toBe("E");
  });

  it("traces back from the history to a clause at a given source", () => {
    const s = run([
      { type: "hover-clause", id: "c0" },
      { type: "trace", clause: "c1", source: "D" },
    ]);
    expect([s.pinnedClause, s.source, s.hoverClause]).toEqual(["c1", "D", null]);
  });
});

describe("caseReducer — history", () => {
  it("opens one row at a time and closes it again", () => {
    const s = run([
      { type: "open-row", id: "A" },
      { type: "open-row", id: "B" },
    ]);
    expect(s.opened).toBe("B");
    expect(caseReducer(s, { type: "open-row", id: "B" }).opened).toBeNull();
  });

  it("locates an artifact by opening its row, then settles", () => {
    const s = run([
      { type: "toggle-pin", id: "c1" },
      { type: "locate", id: "E" },
    ]);
    expect([s.located, s.opened, s.pinnedClause]).toEqual(["E", "E", "c1"]);
    const settled = caseReducer(s, { type: "settle-locate" });
    expect([settled.located, settled.opened]).toEqual([null, "E"]);
    expect(caseReducer(settled, { type: "settle-locate" })).toBe(settled);
  });
});

describe("caseReducer — Escape precedence", () => {
  it("closes the verdict popover, then the clause's evidence, then an open row", () => {
    let s = run([
      { type: "open-row", id: "A" },
      { type: "toggle-pin", id: "c1" },
      { type: "toggle-verdict" },
    ]);
    s = caseReducer(s, { type: "escape" });
    expect([s.verdictOpen, s.pinnedClause, s.opened]).toEqual([false, "c1", "A"]);
    s = caseReducer(s, { type: "escape" });
    expect([s.pinnedClause, s.opened]).toEqual([null, "A"]);
    s = caseReducer(s, { type: "escape" });
    expect(s.opened).toBeNull();
    expect(caseReducer(s, { type: "escape" })).toBe(s);
  });
});

describe("caseReducer — toggles", () => {
  it("toggles key, code expansion and verdict", () => {
    const s = run([{ type: "toggle-key" }, { type: "toggle-code" }, { type: "toggle-verdict" }]);
    expect([s.keyOpen, s.codeExpanded, s.verdictOpen]).toEqual([true, true, true]);
    expect(initialCaseState(true).keyOpen).toBe(true);
  });
});
