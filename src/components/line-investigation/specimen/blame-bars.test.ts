import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW } from "../fixtures/synthetic-retry-cap";
import { syntheticChargeBlame, syntheticChargeLines } from "../fixtures/synthetic-charge-file";
import { blameBars } from "./blame-bars";

const now = Date.parse(SYNTHETIC_NOW);
const bars = blameBars(
  syntheticChargeBlame,
  syntheticChargeLines,
  { start: 1, end: 19 },
  { start: 9, end: 9 },
  now,
);

describe("blameBars", () => {
  it("scales width with age so the oldest visible line gets the full 40px", () => {
    expect(bars.get(1)?.width).toBe(40);
    expect(bars.get(9)?.width).toBe(27);
    expect(bars.get(3)?.width).toBe(20);
    expect(bars.get(11)?.width).toBe(24);
    expect(bars.get(13)?.width).toBe(36);
  });

  it("marks the datum line and every other line of the same commit", () => {
    expect(bars.get(9)?.tone).toBe("datum");
    expect([7, 15, 18].map((l) => bars.get(l)?.tone)).toEqual([
      "same-commit",
      "same-commit",
      "same-commit",
    ]);
    expect(bars.get(1)?.tone).toBe("neutral");
  });

  it("ties same-commit to the commit that last changed a multi-line datum", () => {
    const range = blameBars(
      syntheticChargeBlame,
      syntheticChargeLines,
      { start: 1, end: 19 },
      { start: 14, end: 15 },
      now,
    );
    const same = [...range.values()].filter((b) => b.tone === "same-commit").map((b) => b.line);
    expect(same).toEqual([3]);
    expect([14, 15].map((l) => range.get(l)?.tone)).toEqual(["datum", "datum"]);
  });

  it("draws no bar for blank lines", () => {
    expect(bars.has(4)).toBe(false);
    expect(bars.has(6)).toBe(false);
    expect(bars.size).toBe(17);
  });

  it("never fabricates bars without blame data or outside the returned spans", () => {
    expect(
      blameBars(null, syntheticChargeLines, { start: 1, end: 19 }, { start: 9, end: 9 }, now).size,
    ).toBe(0);
    const partial = blameBars(
      syntheticChargeBlame.filter((s) => s.endLine <= 3),
      syntheticChargeLines,
      { start: 1, end: 19 },
      { start: 9, end: 9 },
      now,
    );
    expect([...partial.keys()]).toEqual([1, 2, 3]);
  });

  it("keeps the commit identity and age for the tooltip and screen readers", () => {
    expect(bars.get(9)).toMatchObject({ shortSha: "92f6a3f", author: "Priya Raman" });
    expect(bars.get(9)!.ageDays / 365.25).toBeCloseTo(3.54, 2);
  });

  it("clamps commits dated after the reference time to age zero", () => {
    const future = [{ ...syntheticChargeBlame[0], endLine: 1, date: "2030-01-01T00:00:00Z" }];
    const [bar] = blameBars(
      future,
      syntheticChargeLines,
      { start: 1, end: 1 },
      { start: 9, end: 9 },
      now,
    ).values();
    expect(bar.ageDays).toBe(0);
    expect(bar.width).toBe(40);
  });
});
