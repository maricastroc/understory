import { describe, expect, it } from "vitest";
import { parseLocation } from "./index";

describe("parseLocation", () => {
  it("parses file:line into a single-line span", () => {
    expect(parseLocation("src/app/charge.ts:8")).toEqual({
      file: "src/app/charge.ts",
      startLine: 8,
      endLine: 8,
    });
  });

  it("parses a start-end range", () => {
    expect(parseLocation("charge.ts:8-12")).toEqual({
      file: "charge.ts",
      startLine: 8,
      endLine: 12,
    });
  });

  it("accepts a comma-separated range", () => {
    expect(parseLocation("charge.ts:8,12")).toEqual({
      file: "charge.ts",
      startLine: 8,
      endLine: 12,
    });
  });

  it("splits on the last colon so paths with colons still work", () => {
    expect(parseLocation("a/b:c.ts:5").file).toBe("a/b:c.ts");
  });

  it("rejects a location with no line", () => {
    expect(() => parseLocation("charge.ts")).toThrow();
  });

  it("rejects a non-numeric line", () => {
    expect(() => parseLocation("charge.ts:abc")).toThrow();
  });

  it("rejects an empty file", () => {
    expect(() => parseLocation(":8")).toThrow();
  });
});
