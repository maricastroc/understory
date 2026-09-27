import { describe, expect, it } from "vitest";
import { caseReducer, drawerOpen, effectiveClause, initialCaseState } from "./case-reducer";
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

  it("unpins by clicking the pinned clause again or with Clear", () => {
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

describe("caseReducer — drawer", () => {
  it("switches between list and artifact modes", () => {
    const list = run([{ type: "open-list" }]);
    expect(drawerOpen(list)).toBe(true);
    const art = caseReducer(list, { type: "inspect", id: "A" });
    expect([art.inspected, art.drawerList]).toEqual(["A", false]);
    expect(caseReducer(art, { type: "open-list" })).toMatchObject({
      inspected: null,
      drawerList: true,
    });
  });

  it("steps by depth order and stops at both ends", () => {
    const order = ["A", "B", "C"];
    const s = run([
      { type: "inspect", id: "B" },
      { type: "step", order, delta: 1 },
    ]);
    expect(s.inspected).toBe("C");
    expect(caseReducer(s, { type: "step", order, delta: 1 })).toBe(s);
    expect(
      run([
        { type: "inspect", id: "A" },
        { type: "step", order, delta: -1 },
      ]).inspected,
    ).toBe("A");
  });

  it("leaves the clause state alone when an artifact is inspected", () => {
    const s = run([
      { type: "toggle-pin", id: "c1" },
      { type: "inspect", id: "A" },
    ]);
    expect(s.pinnedClause).toBe("c1");
  });
});

describe("caseReducer — Escape precedence", () => {
  it("closes the drawer, then the verdict popover, then unpins", () => {
    let s = run([
      { type: "toggle-pin", id: "c1" },
      { type: "toggle-verdict" },
      { type: "inspect", id: "A" },
    ]);
    s = caseReducer(s, { type: "escape" });
    expect([drawerOpen(s), s.verdictOpen, s.pinnedClause]).toEqual([false, true, "c1"]);
    s = caseReducer(s, { type: "escape" });
    expect([s.verdictOpen, s.pinnedClause]).toEqual([false, "c1"]);
    s = caseReducer(s, { type: "escape" });
    expect(s.pinnedClause).toBeNull();
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
