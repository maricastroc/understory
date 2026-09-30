import { describe, expect, it } from "vitest";
import { datumToken } from "../../line-investigation/specimen/datum-token";
import {
  landingBlame,
  landingLines,
  landingRejected,
  landingVersions,
  landingView,
} from "./landing-fixture";

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

  it("give line versions only to collected artifacts, aligned on the token's column", () => {
    const ids = new Set(landingView.artifacts.map((a) => a.id));
    expect(landingVersions.every((v) => ids.has(v.artifactId))).toBe(true);
    const token = datumToken(landingView.question, landingLines[8])!;
    const [revision, origin] = landingVersions;
    expect(revision.text.slice(0, token.start)).toBe(landingLines[8].slice(0, token.start));
    expect(revision.text[token.start]).toBe("5");
    expect(origin.text.length).toBeLessThan(token.start);
  });

  it("keep blame spans inside the file and contiguous", () => {
    const covered = landingBlame.flatMap((s) =>
      Array.from({ length: s.endLine - s.startLine + 1 }, (_, i) => s.startLine + i),
    );
    expect(covered).toEqual(landingLines.map((_, i) => i + 1));
  });
});
