import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { controlCases } from "./control-cases";

describe("the written controls kept for the dev routes", () => {
  it("are rebuilt from the kept control, judgement and evidence exactly as the fixture holds them", () => {
    const fixture = JSON.parse(
      readFileSync("src/components/line-investigation/fixtures/control-cases.json", "utf8"),
    );
    expect(fixture).toEqual(JSON.parse(JSON.stringify(controlCases())));
  });
});
