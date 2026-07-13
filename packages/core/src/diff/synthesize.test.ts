import { describe, expect, it } from "vitest";
import { buildDiffSynthesisInput, clusterRef, formatTargets } from "./synthesize";
import type { DiffCollection } from "./types";

const collection = (): DiffCollection => ({
  repo: { path: "o/r", name: "r" },
  pr: { number: 12, title: "cap retries", url: "u", baseSha: "b", headSha: "h" },
  clusters: [
    {
      commitId: "commit:c1",
      targets: [{ path: "src/a.ts", range: { start: 8, end: 8 } }],
      artifacts: [
        { id: "commit:c1", kind: "commit", title: "t", body: "caps retries at 3", url: "", date: "2024-01-01" },
      ],
      contradictions: [],
      rank: 1,
    },
  ],
  triage: {
    filesChanged: 1,
    filesConsidered: 1,
    filesSkipped: 0,
    targetsBlamed: 1,
    clustersFound: 1,
    clustersDetailed: 1,
    truncated: false,
  },
});

describe("diff synthesis input", () => {
  it("labels regions and renders their location + evidence ids", () => {
    const { prompt } = buildDiffSynthesisInput(collection());
    expect(prompt).toContain("C1 — code changed at src/a.ts:8");
    expect(prompt).toContain("[commit:c1]");
    expect(prompt).toContain("#12: cap retries");
  });

  it("defaults to English and switches to Portuguese on request", () => {
    expect(buildDiffSynthesisInput(collection()).system).toContain("in English");
    expect(buildDiffSynthesisInput(collection(), "pt").system).toContain("Brazilian Portuguese");
  });
});

describe("helpers", () => {
  it("clusterRef is 1-based", () => {
    expect(clusterRef(0)).toBe("C1");
    expect(clusterRef(4)).toBe("C5");
  });
  it("formatTargets renders single lines and ranges", () => {
    expect(formatTargets([{ path: "a.ts", range: { start: 8, end: 8 } }])).toBe("a.ts:8");
    expect(formatTargets([{ path: "a.ts", range: { start: 8, end: 12 } }])).toBe("a.ts:8-12");
  });
});
