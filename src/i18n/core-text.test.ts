import { describe, expect, it } from "vitest";
import { coreText } from "./core-text";

const NOTE =
  "GitHub's blame API couldn't resolve line-level history for this file — showing recent commits that touched it instead.";

describe("coreText", () => {
  it("keeps core's own English words in English, and says the same thing in Portuguese", () => {
    expect(coreText("en", "fileLevelNote", NOTE)).toBe(NOTE);
    const pt = coreText("pt-BR", "fileLevelNote", NOTE);
    expect(pt).toMatch(/^O blame do provedor não trouxe o histórico desta linha/);
    expect(pt).not.toContain("—");
  });
});
