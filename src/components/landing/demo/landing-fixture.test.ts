import { describe, expect, it } from "vitest";
import { landingPrView } from "../pr/landing-pr-fixture";
import { prDiagramLabel } from "../pr/pr-diagram-label";
import { landingBlame, landingLines, landingRejected, landingView } from "./landing-fixture";

describe("landing fixtures", () => {
  it("derive the retry-cap case through the real view model", () => {
    expect(landingView.verdict).toBe("resolved");
    expect(landingView.clauses.map((c) => c.letters)).toEqual([
      ["A", "D"],
      ["E", "D"],
      ["B", "C"],
    ]);
    expect(landingView.clauses.every((c) => c.grounded && !c.silent)).toBe(true);
    const issue = landingView.artifacts.find((a) => a.id === "issue:1187")!;
    expect(issue.verified).toBe(true);
    expect(issue.quotes.some((q) => q.range !== null)).toBe(true);
  });

  it("show the unrecorded origin only because the PR lookup found nothing", () => {
    expect(landingView.gaps).toHaveLength(1);
    expect(landingView.gaps[0]).toMatchObject({
      afterId: "commit:7be210e",
      verified: true,
      missing: "pull_request",
    });
  });

  it("reject a citation that is not in the evidence with the real check", () => {
    expect(landingRejected).toEqual(["pr:9999"]);
  });

  it("keep blame spans inside the file and contiguous", () => {
    const covered = landingBlame.flatMap((s) =>
      Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i),
    );
    expect(covered).toEqual(landingLines.map((_, i) => i + 1));
  });

  it("derive six regions: four under one pull request, two silent", () => {
    expect(landingPrView.regions.map((r) => r.state)).toEqual([
      "explained",
      "explained",
      "explained",
      "explained",
      "silent",
      "silent",
    ]);
    expect(landingPrView.regionsOf.get("pr:1020")).toEqual(["R1", "R2", "R3", "R4"]);
    expect(landingPrView.regionsOf.get("issue:140")).toEqual(["R1"]);
    expect(prDiagramLabel(landingPrView)).toBe(
      "6 changed regions: 4 share one pull request, 2 end in unrecorded history",
    );
  });
});
