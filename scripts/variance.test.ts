import { describe, expect, it } from "vitest";
import type { CitationCheck, VerifiedNarrative } from "@git-investigator/core/types";
import { type RunOutcome, ownerVerdictOf, summarizeVariance } from "./variance";

function ok(
  level: "high" | "medium" | "low",
  score: number,
  owner: "supported" | "weak" | "unsupported" | "absent",
  extra: { supported?: number; misattributed?: number; audited?: boolean } = {},
): RunOutcome {
  return {
    ok: true,
    level,
    score,
    owner,
    supported: extra.supported ?? (owner === "supported" ? 1 : 0),
    misattributed: extra.misattributed ?? 0,
    audited: extra.audited ?? true,
  };
}

const fail = (reason: "rate-limit" | "error"): RunOutcome => ({
  ok: false,
  reason,
  message: reason,
});

describe("summarizeVariance", () => {
  it("flags an unstable distribution when the level differs across runs", () => {
    const s = summarizeVariance([
      ok("high", 0.85, "supported"),
      ok("medium", 0.55, "weak"),
      ok("high", 0.85, "supported"),
    ]);
    expect(s.ok).toBe(3);
    expect(s.levels).toEqual({ high: 2, medium: 1, low: 0 });
    expect(s.distinctLevels).toBe(2);
    expect(s.stable).toBe(false);
    expect(s.owner.supported).toBe(2);
    expect(s.owner.weak).toBe(1);
  });

  it("computes score min/max/mean/swing over successful runs only", () => {
    const s = summarizeVariance([
      ok("high", 0.85, "supported"),
      ok("medium", 0.55, "weak"),
      fail("rate-limit"),
    ]);
    expect(s.score).not.toBeNull();
    expect(s.score?.min).toBe(0.55);
    expect(s.score?.max).toBe(0.85);
    expect(s.score?.mean).toBeCloseTo(0.7, 5);
    expect(s.score?.swing).toBeCloseTo(0.3, 5);
  });

  it("reports stable when every run lands on the same level", () => {
    const s = summarizeVariance([ok("high", 0.85, "supported"), ok("high", 0.9, "supported")]);
    expect(s.distinctLevels).toBe(1);
    expect(s.stable).toBe(true);
    expect(s.score?.swing).toBeCloseTo(0.05, 5);
  });

  it("counts rate-limit and error failures separately", () => {
    const s = summarizeVariance([
      ok("medium", 0.55, "weak"),
      fail("rate-limit"),
      fail("error"),
      fail("rate-limit"),
    ]);
    expect(s.ok).toBe(1);
    expect(s.failed).toEqual({ total: 3, rateLimit: 2, error: 1 });
  });

  it("returns a null score when no run completed", () => {
    const s = summarizeVariance([fail("rate-limit"), fail("rate-limit")]);
    expect(s.ok).toBe(0);
    expect(s.score).toBeNull();
  });

  it("tallies runs whose citation audit did not complete", () => {
    const s = summarizeVariance([
      ok("medium", 0.5, "weak", { audited: false }),
      ok("high", 0.85, "supported"),
    ]);
    expect(s.auditUnavailable).toBe(1);
  });
});

function narrativeWith(checks: CitationCheck[], checked = true): VerifiedNarrative {
  return {
    answer: "",
    claims: [],
    citations: [],
    recorded: true,
    answerable: true,
    grounded: true,
    unknownCitations: [],
    ungroundedClaims: 0,
    confidence: {
      score: 0.5,
      level: "medium",
      primarySources: 0,
      corroborating: 0,
      contradicting: 0,
    },
    entailment: {
      checked,
      checks,
      supported: checks.filter((c) => c.status === "supported").length,
      misattributed: checks.filter((c) => c.status === "unsupported").length,
    },
  };
}

const chk = (citation: string, status: CitationCheck["status"]): CitationCheck => ({
  citation,
  status,
  quote: status === "supported" ? "proof" : null,
  reason: "",
});

describe("ownerVerdictOf", () => {
  const ownerIds = new Set(["commit:o"]);

  it("is 'supported' when the owner's own check is supported", () => {
    expect(ownerVerdictOf(narrativeWith([chk("commit:o", "supported")]), ownerIds)).toBe(
      "supported",
    );
  });

  it("is 'weak' when the owner is only on-topic", () => {
    expect(ownerVerdictOf(narrativeWith([chk("commit:o", "weak")]), ownerIds)).toBe("weak");
  });

  it("is 'unsupported' when the owner was misattributed", () => {
    expect(ownerVerdictOf(narrativeWith([chk("commit:o", "unsupported")]), ownerIds)).toBe(
      "unsupported",
    );
  });

  it("prefers 'supported' when the owner appears in two claims", () => {
    expect(
      ownerVerdictOf(
        narrativeWith([chk("commit:o", "weak"), chk("commit:o", "supported")]),
        ownerIds,
      ),
    ).toBe("supported");
  });

  it("is 'absent' when no check cites the owner", () => {
    expect(ownerVerdictOf(narrativeWith([chk("commit:x", "supported")]), ownerIds)).toBe("absent");
  });

  it("is 'absent' when the audit did not run", () => {
    expect(ownerVerdictOf(narrativeWith([chk("commit:o", "supported")], false), ownerIds)).toBe(
      "absent",
    );
  });
});
