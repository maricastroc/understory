import { describe, expect, it } from "vitest";
import type { DiffResult, VerifiedDiffFinding } from "@git-investigator/core/diff/types";
import type { Artifact, ArtifactKind } from "@git-investigator/core/types";
import { prMetrics } from "./pr-metrics";

const art = (id: string, kind: ArtifactKind): Artifact => ({
  id,
  kind,
  title: id,
  body: "",
  url: "",
  date: "2024-01-01",
});

const finding = (over: Partial<VerifiedDiffFinding> = {}): VerifiedDiffFinding => ({
  ref: "C1",
  targets: [{ path: "a.ts", range: { start: 1, end: 1 } }],
  why: "x",
  citations: [],
  unknownCitations: [],
  grounded: true,
  recorded: true,
  confidence: { score: 0.9, level: "high", primarySources: 1, corroborating: 0, contradicting: 0 },
  artifacts: [],
  contradictions: [],
  ...over,
});

const result = (findings: VerifiedDiffFinding[]): DiffResult => ({
  repo: { path: "o/r", name: "r" },
  pr: { number: 1, title: "t", url: "u", baseSha: "b", headSha: "h" },
  triage: {
    filesChanged: 4,
    filesConsidered: 3,
    filesSkipped: 1,
    targetsBlamed: 5,
    clustersFound: 2,
    clustersDetailed: 2,
    truncated: false,
  },
  summary: "s",
  findings,
});

describe("prMetrics", () => {
  it("counts distinct upstream evidence across regions, once each", () => {
    const shared = art("pr:9", "pull_request"); // cited from two regions — must count once
    const m = prMetrics(
      result([
        finding({ artifacts: [art("commit:a", "commit"), shared, art("issue:7", "issue")] }),
        finding({ artifacts: [art("commit:b", "commit"), shared, art("review:9-0", "review")] }),
      ]),
    );
    expect(m.originCommits).toBe(2);
    expect(m.pullRequests).toBe(1); // shared PR counted once
    expect(m.issues).toBe(1);
    expect(m.reviews).toBe(1);
  });

  it("counts a region as explained only when recorded AND grounded", () => {
    const m = prMetrics(
      result([
        finding({ recorded: true, grounded: true }),
        finding({ recorded: false, grounded: true }), // history silent
        finding({ recorded: true, grounded: false }), // fabrication caught
      ]),
    );
    expect(m.regionsExplained).toBe(1);
  });

  it("passes triage file counts straight through", () => {
    const m = prMetrics(result([finding()]));
    expect(m.filesChanged).toBe(4);
    expect(m.filesWithHistory).toBe(3);
  });
});
