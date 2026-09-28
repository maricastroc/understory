import { describe, expect, it } from "vitest";
import { syntheticCases } from "../line-investigation/fixtures/synthetic-cases";
import { casePaths } from "./case-paths";
import { repoKey } from "./repo-key";

describe("repoKey", () => {
  it("treats the forms of one GitHub repo as the same repo and keeps local paths", () => {
    expect(repoKey("https://github.com/Acme/Pay.git")).toBe("acme/pay");
    expect(repoKey("acme/pay")).toBe("acme/pay");
    expect(repoKey(".demo/payments-service/")).toBe(".demo/payments-service");
  });
});

describe("casePaths", () => {
  it("counts line cases per file for this repo, most recent first", () => {
    const repo = syntheticCases[0].form.repoPath;
    const { ordered, counts } = casePaths(syntheticCases, repo);
    const files = syntheticCases
      .filter((e) => e.form.repoPath === repo && e.result.evidence.location)
      .map((e) => e.result.evidence.location!.file);
    expect(ordered[0]).toBe(files[0]);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(files.length);
    expect(casePaths(syntheticCases, "someone/else").ordered).toEqual([]);
  });
});
