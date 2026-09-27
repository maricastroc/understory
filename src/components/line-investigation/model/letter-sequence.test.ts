import { describe, expect, it } from "vitest";
import { letterAt } from "./letter-sequence";

describe("letterAt", () => {
  it("runs A…Z, then AA, AB… instead of punctuation", () => {
    expect([0, 1, 25].map(letterAt)).toEqual(["A", "B", "Z"]);
    expect([26, 27, 51, 52, 701, 702].map(letterAt)).toEqual(["AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });

  it("never repeats a letter across a long history", () => {
    const letters = Array.from({ length: 800 }, (_, i) => letterAt(i));
    expect(new Set(letters).size).toBe(800);
  });
});
