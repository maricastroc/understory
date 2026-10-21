import { readFileSync } from "node:fs";
import type { Evidence } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { type ChangeRecord, EXPECTATIONS, type Expectation } from "./eval-pertinence";
import { designInputs, promptHash, validationInputs } from "./eval-pertinence-replay";
import type { Snapshot } from "./eval-readings";

const snapshot = JSON.parse(
  readFileSync("eval/results/2026-10-14-reading-evidence.json", "utf8"),
) as Snapshot;
const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence as Evidence]));
const expectations = (JSON.parse(readFileSync(EXPECTATIONS, "utf8")) as { controls: Expectation[] })
  .controls;
const records = (
  JSON.parse(readFileSync("eval/results/2026-10-21-pertinence-contexts.json", "utf8")) as {
    changes: ChangeRecord[];
  }
).changes;

describe("the replay's inputs, fixed before it runs", () => {
  it("asks the question proposed in #75, unchanged", () => {
    expect(promptHash()).toBe("75f47b5c3464");
  });

  it("takes the 17 clusters presented today, 19 inputs, as the design set", () => {
    const inputs = designInputs(evidence, expectations, records);
    expect(inputs).toHaveLength(19);
    const clusters = new Map(inputs.map((i) => [i.cluster, i.kind]));
    expect(clusters.size).toBe(17);
    const kinds = [...clusters.values()];
    expect(kinds.filter((k) => k === "borrowed")).toHaveLength(3);
    expect(kinds.filter((k) => k === "interpretive")).toHaveLength(2);
    expect(kinds.filter((k) => k === "true")).toHaveLength(12);
  });

  it("takes the eight verifiable borrowed controls not presented today as the validation set, each with its passage located", () => {
    const inputs = validationInputs(snapshot, expectations);
    expect(inputs.map((i) => [i.id, i.group, i.kind])).toEqual([
      ["tslint-257", "same change", "borrowed"],
      ["tslint-257", "same change", "borrowed"],
      ["draft-644", "same change", "borrowed"],
      ["apollo-http-10", "same change", "borrowed"],
      ["jitter", "another change", "borrowed"],
      ["retry-cap", "another change", "borrowed"],
      ["ws-batch-size", "another change", "borrowed"],
      ["ws-revert-story", "another change", "borrowed"],
    ]);
    for (const i of inputs) expect(i.passages[0].parts.length, i.id).toBeGreaterThan(0);
  });

  it("keeps the two sets apart", () => {
    const design = new Set(designInputs(evidence, expectations, records).map((i) => i.sentence));
    for (const i of validationInputs(snapshot, expectations))
      expect(design.has(i.sentence)).toBe(false);
  });
});
