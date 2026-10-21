import { readFileSync } from "node:fs";
import type { Evidence } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { parseControls, parseReplay } from "./eval-audit-claims";
import {
  type Answer,
  BUDGETS,
  type ChangeRecord,
  EXPECTATIONS,
  type Expectation,
  analyse,
  budgetKey,
  contextOf,
  expectationKey,
  itemsOf,
  lineAt,
  tabulate,
} from "./eval-pertinence";
import { verdictFor } from "./eval-presentation";
import { keptRuns, manualFor } from "./eval-present";
import type { Snapshot } from "./eval-readings";
import { parseRecords } from "./eval-report";

const kept = JSON.parse(
  readFileSync("eval/results/2026-10-21-pertinence-contexts.json", "utf8"),
) as {
  evidence: string;
  replay: string;
  budget: number;
  analysis: ReturnType<typeof analyse>;
  items: string[];
  changes: ChangeRecord[];
};
const snapshot = JSON.parse(readFileSync(kept.evidence, "utf8")) as Snapshot;
const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence as Evidence]));
const expectations = (JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] })
  .controls;
const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
const items = itemsOf(
  evidence,
  controls,
  parseReplay(readFileSync(kept.replay, "utf8")).judgements,
  keptRuns().map((file) => {
    const manual = manualFor(file);
    return {
      file,
      runs: parseRecords(readFileSync(`eval/results/${file}`, "utf8")).runs,
      verdict: (run) => verdictFor(file, run, manual),
    };
  }),
  expectations,
);
const record = (id: string, change?: string) =>
  kept.changes.find((r) => r.id === id && (change ? r.change === change : r.last))!;

describe("the expectations, written before any model was asked", () => {
  it("place every control that borrows a reason, and nothing else", () => {
    const borrowed = controls.filter(
      (c) =>
        /^gives the (line|last change)/.test(c.kind) &&
        !/the part of the change it belongs to/.test(c.kind),
    );
    expect(expectations.map(expectationKey).sort()).toEqual(borrowed.map(expectationKey).sort());
  });

  it("point each located reason to a row the change really changed", () => {
    for (const e of expectations)
      if (e.where && "path" in e.where)
        expect(record(e.id).budgets.all.holds, expectationKey(e)).toContain(expectationKey(e));
  });
});

describe("the items, rebuilt from the kept runs and judgements", () => {
  it("are the ones the kept file lists", () => {
    expect(items.map((i) => [i.key, i.change, i.group, i.belongs ?? ""].join(" | "))).toEqual(
      kept.items,
    );
  });

  it("are, among the controls, 18 borrowed reasons and 42 true ones, each under the change it sits under", () => {
    const own = items.filter((i) => i.set === "controls");
    expect(own.filter((i) => i.group === "borrowed")).toHaveLength(18);
    expect(own.filter((i) => i.group === "true" && i.last)).toHaveLength(23);
    expect(own.filter((i) => i.group === "true" && !i.last)).toHaveLength(19);
    expect(new Set(own.filter((i) => i.group === "borrowed").map((i) => i.id))).toEqual(
      new Set(["tslint-189", "tslint-257", "machine-32"]),
    );
  });
});

describe("the analysis", () => {
  it("is what the items and the kept changes give", () => {
    expect(analyse(items, kept.changes, expectations)).toEqual(kept.analysis);
  });

  it("finds the line in every change, and every patch returned", () => {
    expect(kept.analysis.changes.lineNotFound).toEqual([]);
    expect(kept.analysis.changes.patchNotReturned).toEqual([]);
  });

  it("holds every placed reason only from the budget the README gives", () => {
    expect(
      kept.analysis.borrowedWhere.map((b) => [
        b.id,
        b.belongs,
        b.presented,
        BUDGETS.map(budgetKey).find((k) => b.kept[k]) ?? null,
      ]),
    ).toEqual([
      ["tslint-257", "another part of the same file", 4, "32000"],
      ["tslint-257", "another file", 0, "32000"],
      ["tslint-257", "another file", 0, "16000"],
      ["tslint-189", "another file", 4, "16000"],
      ["tslint-189", "another file", 4, "16000"],
      ["draft-644", "another file", 0, "32000"],
      ["apollo-http-10", "another file", 0, "8000"],
    ]);
  });

  it("keeps in the default map every part a presented borrowed reason belongs to", () => {
    for (const b of kept.analysis.borrowedWhere)
      if (b.presented) expect(b.kept[budgetKey(kept.budget)]).toBe(true);
  });
});

describe("a context", () => {
  it("holds the sentence, its passages, the line and the map of its change", () => {
    const item = items.find((i) => i.id === "tslint-189" && i.group === "borrowed")!;
    const text = contextOf(item, record("tslint-189"));
    expect(text).toContain(`Sentence: ${item.claim}`);
    expect(text).toContain("Passage [pr:3412 · description]");
    expect(text).toContain("The line: src/linter.ts · if (Formatter === undefined) {");
    expect(text).toContain("src/formatterLoader.ts · modified · +28 −15");
    expect(text).toContain("fullPath = require.resolve(formatterPath);");
  });

  it("reads the line as it stood after an earlier change", () => {
    expect(lineAt(evidence.get("ws-batch-size")!, "commit:78ff826")?.text.trim()).toBe(
      "const PAGE_SIZE = 250;",
    );
  });
});

describe("tabulating a replay that has not been run", () => {
  const borrowed = items.find((i) => i.id === "tslint-189" && i.group === "borrowed")!;
  const truthful = items.find((i) => i.id === "machine-168" && i.group === "true")!;
  const answer = (item: typeof borrowed, replay: number, a: Answer, truncated = false) => ({
    key: item.key,
    change: item.change,
    replay,
    answer: a,
    truncated,
  });

  it("keeps each answer apart, and the answers on a cut context in a column of their own", () => {
    const table = tabulate(items, [
      answer(borrowed, 0, "another file"),
      answer(borrowed, 1, "insufficient evidence"),
      answer(borrowed, 2, "indeterminate", true),
      answer(truthful, 0, "the line's part"),
      answer(truthful, 1, "another part of the same file"),
    ]);
    expect(table["controls · tslint-189 · borrowed"]).toEqual({
      answers: 3,
      byAnswer: { "another file": 1, "insufficient evidence": 1, indeterminate: 1 },
      onATruncatedContext: { indeterminate: 1 },
      stillShown: {
        "a located other part or not in the change": 2,
        "and insufficient evidence": 1,
        "and indeterminate": 0,
      },
    });
    expect(table["controls · machine-168 · true"].stillShown).toEqual({
      "a located other part or not in the change": 1,
      "and insufficient evidence": 1,
      "and indeterminate": 1,
    });
  });
});
