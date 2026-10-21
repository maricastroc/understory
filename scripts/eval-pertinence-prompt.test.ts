import { type ChangedFile, changeMap, renderChangeMap } from "@understory/core/collect/change-map";
import { describe, expect, it } from "vitest";
import {
  PERTINENCE_SYSTEM,
  pertinenceSchema,
  renderPertinence,
  rowsOfMap,
  settle,
} from "./eval-pertinence-prompt";
import { type Cluster, POLICIES, outcomes, score } from "./eval-pertinence-score";

const hunk = (at: number, rows: string[], section = "") => {
  const before = rows.filter((r) => !r.startsWith("+")).length;
  const after = rows.filter((r) => !r.startsWith("-")).length;
  return [`@@ -${at},${before} +${at},${after} @@${section ? ` ${section}` : ""}`, ...rows].join(
    "\n",
  );
};
const file = (path: string, ...hunks: string[]): ChangedFile => ({
  path,
  status: "modified",
  added: 1,
  removed: 1,
  patch: hunks.join("\n"),
});

const LINTER = file(
  "src/linter.ts",
  hunk(140, [
    "-        if (Formatter !== undefined) {",
    "+        if (Formatter === undefined) {",
    "             throw new Error('not found');",
    ...Array.from({ length: 12 }, (_, i) => ` keep(${i});`),
    "+        return removeDisabledFailures(sourceFile, failures);",
  ]),
);
const LOADER = file(
  "src/formatterLoader.ts",
  hunk(60, ["+        fullPath = require.resolve(formatterPath);"]),
);
const MAP = renderChangeMap(
  changeMap([LINTER, LOADER], { path: "src/linter.ts", text: "if (Formatter === undefined) {" }),
);

describe("the question", () => {
  it("names the six answers and asks for a row only where one can be shown", () => {
    expect(pertinenceSchema.shape.verdict.options).toEqual([
      "the_line",
      "another_part",
      "not_in_change",
      "insufficient",
      "indeterminate",
    ]);
    expect(PERTINENCE_SYSTEM).toContain("not from the words they share with the passage");
    expect(PERTINENCE_SYSTEM).toContain("do not take its\nword for it");
  });

  it("is rendered from the line, the sentence, the passages and the map, in that order", () => {
    const text = renderPertinence({
      line: {
        path: "src/linter.ts",
        number: 141,
        text: "if (Formatter === undefined) {",
        did: "rewrote",
        before: "if (Formatter !== undefined) {",
      },
      sentence: "The condition was rewritten to allow uncompiled custom formatters.",
      passages: [
        {
          source: "pr:3412",
          kind: "pull request",
          parts: ["description"],
          text: "* allow uncompiled custom formatters",
        },
      ],
      change: { id: "commit:8b853b2", title: "Cleanup and refactoring", files: 2 },
      map: MAP,
    });
    const order = [
      "The line under investigation, as numbered in this change: src/linter.ts:141",
      "What this change did to it: rewrote it; before, it read: if (Formatter !== undefined) {",
      "The sentence under review (it claims the reason; it may be wrong):",
      "[pr:3412 · pull request, description] “* allow uncompiled custom formatters”",
      "The change: commit:8b853b2 · Cleanup and refactoring · 2 files",
      "src/formatterLoader.ts · modified",
    ].map((part) => text.indexOf(part));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("settling an answer, with no model", () => {
  const row = (needle: string) => rowsOfMap(MAP).find((r) => r.text.includes(needle))!.text;

  it("reads the rows of a map, each with its file, and finds the investigated line", () => {
    const rows = rowsOfMap(MAP);
    expect(rows.find((r) => r.line)?.text).toBe("+  140         if (Formatter === undefined) {");
    expect(new Set(rows.map((r) => r.path))).toEqual(
      new Set(["src/linter.ts", "src/formatterLoader.ts"]),
    );
  });

  it("places a cited row in the line's own block, elsewhere in its file, or in another file", () => {
    expect(
      settle({ verdict: "the_line", row: row("Formatter === undefined"), reason: "" }, MAP),
    ).toBe("the line's part");
    expect(
      settle({ verdict: "the_line", row: row("Formatter !== undefined"), reason: "" }, MAP),
    ).toBe("the line's part");
    expect(
      settle({ verdict: "another_part", row: row("removeDisabledFailures"), reason: "" }, MAP),
    ).toBe("another part of the same file");
    expect(settle({ verdict: "another_part", row: row("require.resolve"), reason: "" }, MAP)).toBe(
      "another file",
    );
  });

  it("does not take the verdict's word when the row says otherwise, or when the row is not in the map", () => {
    expect(settle({ verdict: "the_line", row: row("require.resolve"), reason: "" }, MAP)).toBe(
      "row contradicts the verdict",
    );
    expect(
      settle({ verdict: "another_part", row: row("Formatter === undefined"), reason: "" }, MAP),
    ).toBe("row contradicts the verdict");
    expect(
      settle({ verdict: "another_part", row: "+   61 something made up", reason: "" }, MAP),
    ).toBe("row not in the map");
  });

  it("keeps the three answers that cite no row apart", () => {
    expect(settle({ verdict: "not_in_change", row: "", reason: "" }, MAP)).toBe(
      "not in the change",
    );
    expect(settle({ verdict: "insufficient", row: "", reason: "" }, MAP)).toBe(
      "insufficient evidence",
    );
    expect(settle({ verdict: "indeterminate", row: "", reason: "" }, MAP)).toBe("indeterminate");
  });
});

describe("scoring a replay that has not been run", () => {
  const cluster = (key: string, over: Partial<Cluster>): Cluster => ({
    key,
    id: key,
    change: "commit:a",
    last: true,
    set: "controls",
    label: null,
    runs: {},
    inputs: [],
    cut: false,
    ...over,
  });
  const label = (belongs: string, basis: "verifiable" | "interpretive", accept: string[]) => ({
    id: "x",
    text: "x",
    belongs: belongs as never,
    basis,
    accept,
    where: null,
    why: "",
  });
  const clusters = [
    cluster("borrowed", { label: label("another file", "verifiable", ["another file"]) }),
    cluster("true", { label: label("the line's part", "verifiable", ["the line's part"]) }),
    cluster("open", { label: label("interpretive", "interpretive", []), cut: true }),
  ];
  const asked = [
    ...[0, 1, 2].map((replay) => ({
      cluster: "borrowed",
      input: 0,
      replay,
      settled: "another file" as const,
    })),
    { cluster: "true", input: 0, replay: 0, settled: "the line's part" as const },
    { cluster: "true", input: 0, replay: 1, settled: "insufficient evidence" as const },
    { cluster: "true", input: 0, replay: 2, settled: "insufficient evidence" as const },
    { cluster: "open", input: 0, replay: 0, settled: "indeterminate" as const },
    { cluster: "open", input: 0, replay: 1, settled: "another part of the same file" as const },
  ];

  it("counts a cluster once, by the answer most of its calls give, however many calls it had", () => {
    const results = outcomes(clusters, asked);
    expect(results.map((r) => [r.key, r.modal, Math.round(r.agreement * 100)])).toEqual([
      ["borrowed", "another file", 100],
      ["true", "insufficient evidence", 67],
      ["open", "split", 50],
    ]);
  });

  it("shows what each rule of hiding costs, by kind and by basis, and apart on a cut context", () => {
    const table = score(outcomes(clusters, asked));
    const [strict, insufficient] = Object.keys(POLICIES);
    expect(table.byPolicy[strict]["borrowed control · verifiable"]).toMatchObject({
      clusters: 1,
      hidden: 1,
    });
    expect(table.byPolicy[strict]["true control · verifiable"]).toMatchObject({
      clusters: 1,
      hidden: 0,
    });
    expect(table.byPolicy[insufficient]["true control · verifiable"]).toMatchObject({
      clusters: 1,
      hidden: 1,
    });
    expect(table.byPolicy[strict]["control without a label · no label"]).toBeUndefined();
    expect(table.byPolicy[strict]["borrowed control · interpretive"]).toMatchObject({
      clusters: 1,
      split: 1,
      onACutContext: { clusters: 1, hidden: 0, split: 1 },
    });
    expect(table.rightCategory).toEqual({ borrowed: 1, of: 1 });
  });
});
