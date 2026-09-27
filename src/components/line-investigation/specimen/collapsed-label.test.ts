import { describe, expect, it } from "vitest";
import { syntheticChargeLines } from "../fixtures/synthetic-charge-file";
import { symbolInRange } from "./collapsed-label";

describe("symbolInRange", () => {
  it("names the first function declared in the collapsed range", () => {
    expect(symbolInRange(syntheticChargeLines, { start: 20, end: 24 }, "charge.ts")).toBe(
      "isTransient()",
    );
  });

  it("names classes without call parentheses", () => {
    const lines = ["", "class Ledger {", "  post() {}", "}"];
    expect(symbolInRange(lines, { start: 1, end: 4 }, "a.ts")).toBe("Ledger");
  });

  it("ignores a symbol that merely encloses the range", () => {
    expect(symbolInRange(syntheticChargeLines, { start: 10, end: 12 }, "charge.ts")).toBeNull();
  });

  it("can name the symbol nearest the end of a range above the window", () => {
    const lines = ["function first() {", "}", "function second() {", "}", "x"];
    expect(symbolInRange(lines, { start: 1, end: 4 }, "a.ts", "end")).toBe("second()");
    expect(symbolInRange(lines, { start: 1, end: 4 }, "a.ts")).toBe("first()");
  });

  it("returns null when nothing is declared there", () => {
    expect(symbolInRange(syntheticChargeLines, { start: 1, end: 6 }, "charge.ts")).toBeNull();
  });
});
