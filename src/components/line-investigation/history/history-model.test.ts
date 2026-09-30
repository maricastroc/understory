import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "../model/build-investigation-view";
import { historyModel, MIN_RUN, QUIET_DAYS } from "./history-model";
import type { HistoryItem } from "./types";

const now = Date.parse(SYNTHETIC_NOW);
const model = (result = syntheticRetryCap) =>
  historyModel(buildInvestigationView(result, { now }), now);
const shape = (items: HistoryItem[]) =>
  items.map((i) =>
    i.type === "stratum"
      ? i.stratum.id
      : i.type === "run"
        ? `run×${i.strata.length}`
        : `//${Math.round(i.days)}d`,
  );

describe("historyModel", () => {
  it("groups each commit with its pull request, reviews and issue as one stratum", () => {
    const { strata } = model();
    expect(strata.map((s) => s.id)).toEqual(["commit:92f6a3f", "commit:7be210e"]);
    expect(strata[0].members.map((m) => [m.artifact.letter, m.depth])).toEqual([
      ["A", 0],
      ["D", 1],
      ["B", 2],
      ["C", 2],
      ["E", 2],
    ]);
    expect(strata.map((s) => s.current)).toEqual([true, false]);
    expect(strata[1].gaps.map((g) => g.missing)).toEqual(["pull_request"]);
  });

  it("compresses quiet time into explicit breaks instead of distance", () => {
    const { items, originDays } = model();
    expect(shape(items)).toEqual(["//1292d", "commit:92f6a3f", "//635d", "commit:7be210e"]);
    expect(items[0]).toMatchObject({ type: "break", first: true });
    expect(Math.round(originDays!)).toBe(1927);
  });

  it("folds long runs of changes the answer never cites, and keeps the breaks around them", () => {
    const { items, strata } = model(states.syntheticManyOwners(8));
    expect(shape(items)).toEqual([
      "//1292d",
      "commit:92f6a3f",
      "//64d",
      "run×8",
      "//151d",
      "commit:7be210e",
    ]);
    const run = items.find((i) => i.type === "run")!;
    expect(run.type === "run" && run.items.filter((i) => i.type === "break")).toHaveLength(7);
    expect(strata).toHaveLength(10);
    expect(MIN_RUN).toBeGreaterThan(1);
    expect(QUIET_DAYS).toBe(45);
  });

  it("gives every break its own key, even when two quiet spells last as long", () => {
    const { items } = model(states.syntheticManyOwners(8));
    const breaks = items
      .flatMap((i) => (i.type === "run" ? i.items : [i]))
      .flatMap((i) => (i.type === "break" ? [i] : []));
    expect(new Set(breaks.map((b) => Math.round(b.days))).size).toBeLessThan(breaks.length);
    expect(new Set(breaks.map((b) => b.id)).size).toBe(breaks.length);
  });

  it("keeps a short run of uncited changes in place", () => {
    const { items } = model(states.syntheticManyOwners(MIN_RUN - 1));
    expect(items.some((i) => i.type === "run")).toBe(false);
  });
});
