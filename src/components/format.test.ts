import { describe, expect, it } from "vitest";
import { basename, letter } from "./format";

describe("letter / basename", () => {
  it("maps indices to exhibit letters", () => {
    expect(letter(0)).toBe("A");
    expect(letter(25)).toBe("Z");
  });

  it("takes the last non-empty path segment", () => {
    expect(basename("a/b/payments-service")).toBe("payments-service");
    expect(basename("a/b/")).toBe("b");
    expect(basename("solo")).toBe("solo");
  });
});
