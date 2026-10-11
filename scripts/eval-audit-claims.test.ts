import type { EntailmentStatus, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import {
  type Judgement,
  auditedClaims,
  claimReadings,
  lowerReading,
  parseReplay,
  replayCounts,
  replayLines,
} from "./eval-audit-claims";
import type { RunRecord } from "./eval-report";

const narrative = (
  claims: string[],
  checks: { claim: number; citation: string }[],
  checked = true,
): VerifiedNarrative =>
  ({
    answer: "",
    answerable: true,
    recorded: true,
    citations: [],
    claims: claims.map((text) => ({ text, citations: [], grounded: true })),
    entailment: {
      checked,
      supported: 0,
      misattributed: 0,
      checks: checks.map((c) => ({ ...c, status: "weak", quote: null, reason: "" })),
    },
  }) as unknown as VerifiedNarrative;

const run = (id: string, pass: number, n: VerifiedNarrative | null): RunRecord => ({
  type: "run",
  id,
  set: "v2",
  category: "recorded",
  source: "sampled",
  pass,
  ms: 1,
  outcome: { kind: "pass", answerable: true },
  artifacts: [],
  narrative: n,
});

const judged = (
  claim: string,
  replay: number,
  status: EntailmentStatus | null,
  extra: Partial<Judgement> = {},
): Judgement => ({
  type: "judgement",
  id: "case",
  category: "recorded",
  source: "sampled",
  claim,
  citations: ["commit:a"],
  replay,
  control: false,
  raw: status ? { status, quote: "", reason: "" } : null,
  status,
  quote: null,
  fellBack: false,
  ...extra,
});

describe("auditedClaims", () => {
  it("takes each audited claim once, with the sources it was judged against", () => {
    const first = narrative(
      ["the cap is three", "never audited"],
      [
        { claim: 0, citation: "commit:a" },
        { claim: 0, citation: "pr:1" },
      ],
    );
    const again = narrative(
      ["the cap is three"],
      [
        { claim: 0, citation: "commit:a" },
        { claim: 0, citation: "pr:1" },
      ],
    );
    expect(auditedClaims([run("retry", 0, first), run("retry", 1, again)])).toEqual([
      {
        id: "retry",
        set: "v2",
        category: "recorded",
        source: "sampled",
        text: "the cap is three",
        citations: ["commit:a", "pr:1"],
      },
    ]);
  });

  it("keeps the same sentence apart when it cites other sources or belongs to another case", () => {
    const a = narrative(["same"], [{ claim: 0, citation: "commit:a" }]);
    const b = narrative(["same"], [{ claim: 0, citation: "commit:b" }]);
    expect(auditedClaims([run("x", 0, a), run("x", 1, b), run("y", 0, a)])).toHaveLength(3);
  });

  it("skips runs with no narrative and runs whose audit did not happen", () => {
    const unaudited = narrative(["said"], [{ claim: 0, citation: "commit:a" }], false);
    expect(auditedClaims([run("x", 0, null), run("x", 1, unaudited)])).toEqual([]);
  });
});

describe("lowerReading", () => {
  it("takes the least favourable verdict a claim received", () => {
    expect(lowerReading(["supported", "weak", "supported"])).toBe("weak");
    expect(lowerReading(["weak", "unsupported"])).toBe("unsupported");
    expect(lowerReading(["supported"])).toBe("supported");
    expect(lowerReading([])).toBeNull();
  });
});

describe("replayCounts", () => {
  const judgements = [
    judged("steady", 0, "supported"),
    judged("steady", 1, "supported"),
    judged("split", 0, "supported"),
    judged("split", 1, "weak", { raw: { status: "supported", quote: "not there", reason: "" } }),
    judged("split", 2, null, { error: "rate-limited" }),
    judged("once", 0, "unsupported", { fellBack: true }),
    judged("steady", 0, "unsupported", { control: true }),
    judged("split", 0, "supported", { control: true }),
  ];

  it("calls a claim steady only when every replay agreed", () => {
    expect(claimReadings(judgements).map((r) => [r.claim, r.statuses, r.steady])).toEqual([
      ["steady", ["supported", "supported"], true],
      ["split", ["supported", "weak"], false],
      ["once", ["unsupported"], true],
    ]);
  });

  it("counts steadiness over claims replayed more than once and keeps controls apart", () => {
    expect(replayCounts(judgements)).toEqual({
      claims: 2,
      steady: 1,
      judged: 5,
      errored: 1,
      fellBack: 1,
      offered: 4,
      lost: 1,
      supported: 3,
      weak: 1,
      unsupported: 1,
      controls: 2,
      controlSupported: 1,
    });
  });

  it("reports the counts by category and source, never as one rate alone", () => {
    const lines = replayLines(judgements);
    expect(lines[0]).toBe("Claims given the same verdict on every replay: 1 of 2 (50%).");
    expect(lines[1]).toBe("  recorded, sampled: 1 of 2 (50%)");
    expect(lines).toContain(
      "Supported verdicts lost to a quote the source does not contain: 1 of 4 (25%).",
    );
    expect(lines.at(-1)).toBe(
      "Control, each claim against another repository's sources: 1 of 2 (50%) came back supported.",
    );
  });
});

describe("parseReplay", () => {
  it("separates the meta record from the judgements and ignores the usage record", () => {
    const text = [
      JSON.stringify({ type: "meta", kind: "audit-replay", repeat: 2 }),
      JSON.stringify(judged("a", 0, "weak")),
      JSON.stringify({ type: "usage", models: {} }),
      "",
    ].join("\n");
    const { meta, judgements } = parseReplay(text);
    expect(meta?.kind).toBe("audit-replay");
    expect(judgements).toHaveLength(1);
  });
});
