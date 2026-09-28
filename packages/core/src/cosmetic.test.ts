import { describe, expect, it } from "vitest";
import { cosmeticOrigin, looksCosmetic } from "./cosmetic";
import type { Artifact, Evidence } from "./types";
import { scoreConfidence } from "./verify";

describe("looksCosmetic", () => {
  it("flags formatting / lint / refactor / rename subjects", () => {
    for (const s of [
      "style: run prettier",
      "chore: fix eslint warnings",
      "Reformat the module",
      "fix whitespace",
      "refactor: extract helper",
      "refactor res.links()",
      "rename chargeCustomer to charge",
      "renamed the billing module",
      "reindent the block",
    ]) {
      expect(looksCosmetic(s), s).toBe(true);
    }
  });

  it("does not flag substantive subjects", () => {
    for (const s of [
      "billing: bound charge retries with exponential backoff",
      "feat: Environment API (#16471)",
      "fix: prevent double-charge during the outage",
      "add jitter to the backoff delay",
      "wrap the Stripe call in a retry loop",
    ]) {
      expect(looksCosmetic(s), s).toBe(false);
    }
  });
});

const commit = (sha: string, title: string, date: string): Artifact => ({
  id: `commit:${sha}`,
  kind: "commit",
  title,
  body: title,
  url: "",
  date,
  ref: sha,
});

const ev = (artifacts: Artifact[], located = true): Evidence => ({
  question: "why?",
  repo: { path: "o/r" },
  ...(located ? { location: { file: "f.ts", startLine: 1, endLine: 1 } } : {}),
  artifacts,
  contradictions: [],
});

describe("cosmeticOrigin", () => {
  it("returns the owning commit when the latest change looks cosmetic", () => {
    const intro = commit("aaa", "add retry loop", "2023-01-01T00:00:00Z");
    const latest = commit("bbb", "style: run prettier", "2023-06-01T00:00:00Z");
    expect(cosmeticOrigin(ev([intro, latest]))?.id).toBe("commit:bbb");
  });

  it("returns null when the owning commit is substantive (an older cosmetic one does not count)", () => {
    const oldFmt = commit("aaa", "reformat file", "2023-01-01T00:00:00Z");
    const latest = commit("bbb", "bound retries after INC-1187", "2023-06-01T00:00:00Z");
    expect(cosmeticOrigin(ev([oldFmt, latest]))).toBeNull();
  });

  it("returns null for a drill-down (no location) or no commits", () => {
    expect(
      cosmeticOrigin(ev([commit("aaa", "style: fmt", "2023-01-01T00:00:00Z")], false)),
    ).toBeNull();
    expect(cosmeticOrigin(ev([]))).toBeNull();
  });
});

describe("scoreConfidence — cosmetic-origin cap", () => {
  const highBase = {
    recorded: true,
    grounded: true,
    primarySources: 2,
    effectivePrimary: 2,
    supportedPrimary: 2,
    audited: true,
    ungroundedClaims: 0,
    groundedClaims: 2,
    coarseGranularity: false,
    totalCollected: 3,
    contradicting: 0,
  };

  it("reaches HIGH without a cosmetic origin", () => {
    expect(scoreConfidence(highBase).level).toBe("high");
  });

  it("caps HIGH to medium when the origin looks cosmetic", () => {
    expect(scoreConfidence({ ...highBase, cosmeticOrigin: true }).level).toBe("medium");
  });

  it("never lowers a medium (cap only bites HIGH)", () => {
    const medium = scoreConfidence({ ...highBase, supportedPrimary: 1 });
    expect(medium.level).toBe("medium");
    expect(scoreConfidence({ ...highBase, supportedPrimary: 1, cosmeticOrigin: true }).score).toBe(
      medium.score,
    );
  });
});
