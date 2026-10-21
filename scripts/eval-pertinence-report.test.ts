import { describe, expect, it } from "vitest";
import { mostHide } from "./eval-pertinence-report";
import { POLICIES } from "./eval-pertinence-score";

const [strict, insufficient] = Object.values(POLICIES);

describe("a cluster hidden by most of its calls", () => {
  it("is hidden when two hiding answers tie, which the majority category leaves split", () => {
    const answers = [
      "another part of the same file",
      "another file",
      "another file",
      "another part of the same file",
    ] as const;
    expect(mostHide({ answers: [...answers] }, strict)).toBe(true);
  });

  it("is not hidden by half its calls, and an invalid answer never hides", () => {
    expect(mostHide({ answers: ["another file", "the line's part"] }, strict)).toBe(false);
    expect(
      mostHide({ answers: ["another file", "invalid answer", "invalid answer"] }, strict),
    ).toBe(false);
  });

  it("follows the rule of hiding asked for", () => {
    const answers = ["insufficient evidence", "insufficient evidence", "the line's part"] as const;
    expect(mostHide({ answers: [...answers] }, strict)).toBe(false);
    expect(mostHide({ answers: [...answers] }, insufficient)).toBe(true);
  });
});
