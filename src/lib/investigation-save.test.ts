import { describe, expect, it } from "vitest";
import { isMissingColumn, saveSchema } from "./investigation-save";

const base = {
  caseId: "GI-2050",
  question: "why?",
  repoPath: "o/r",
  location: "a.ts:1",
  result: {},
};

describe("saveSchema", () => {
  it("accepts a case with or without a parent", () => {
    expect(saveSchema.parse(base).parentCaseId).toBeUndefined();
    expect(saveSchema.parse({ ...base, parentCaseId: "GI-2049" }).parentCaseId).toBe("GI-2049");
    expect(saveSchema.parse({ ...base, parentCaseId: null }).parentCaseId).toBeNull();
  });

  it("rejects an empty or oversized parent id", () => {
    expect(() => saveSchema.parse({ ...base, parentCaseId: "" })).toThrow();
    expect(() => saveSchema.parse({ ...base, parentCaseId: "x".repeat(65) })).toThrow();
  });
});

describe("isMissingColumn", () => {
  it("recognises Prisma's missing-column error only", () => {
    expect(isMissingColumn({ code: "P2022" })).toBe(true);
    expect(isMissingColumn({ code: "P2002" })).toBe(false);
    expect(isMissingColumn(new Error("x"))).toBe(false);
  });
});
