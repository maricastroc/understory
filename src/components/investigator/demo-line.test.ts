import { describe, expect, it } from "vitest";
import { demoLine } from "./demo-line";

describe("demoLine", () => {
  it("reads a file and line, taking the first line of a range", () => {
    expect(demoLine("packages/styled-components/src/sheet/GroupedTag.ts:55")).toEqual({
      path: "packages/styled-components/src/sheet/GroupedTag.ts",
      line: 55,
    });
    expect(demoLine(" src/billing/charge.ts:8-12 ")).toEqual({
      path: "src/billing/charge.ts",
      line: 8,
    });
  });

  it("ignores a missing or malformed value", () => {
    expect(demoLine(undefined)).toBeNull();
    expect(demoLine("")).toBeNull();
    expect(demoLine("src/billing/charge.ts")).toBeNull();
    expect(demoLine("src/billing/charge.ts:eight")).toBeNull();
  });
});
