import { readFileSync } from "node:fs";
import type { EntailmentStatus, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import {
  type Judgement,
  auditedClaims,
  claimReadings,
  controlLines,
  lowerReading,
  parseControls,
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

describe("the replays published in eval/README.md", () => {
  it("are the lines eval:audit prints for the two kept replays", () => {
    const readme = readFileSync("eval/README.md", "utf8");
    const published = new Set(readme.split("\n").map((line) => line.trim()));
    for (const name of ["2026-10-11-audit-replay-before", "2026-10-11-audit-replay-after"]) {
      expect(readme).toContain(`(results/${name}.jsonl)`);
      const { meta, judgements } = parseReplay(readFileSync(`eval/results/${name}.jsonl`, "utf8"));
      expect(meta?.kind).toBe("audit-replay");
      for (const line of replayLines(judgements)) expect(published).toContain(line.trim());
    }
  });
});

describe("the replay of the written controls published in eval/README.md", () => {
  it("is the lines eval:audit prints for the kept replay, and holds every control as written", () => {
    const readme = readFileSync("eval/README.md", "utf8");
    const published = new Set(readme.split("\n").map((line) => line.trim()));
    const name = "2026-10-12-patch-context-replay-one-question";
    expect(readme).toContain(`(results/${name}.jsonl)`);
    const { meta, judgements } = parseReplay(readFileSync(`eval/results/${name}.jsonl`, "utf8"));
    const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
    expect(meta?.kind).toBe("audit-replay");
    expect(meta?.commit).toBe("b798b88");
    const written = judgements.filter((j) => j.kind);
    expect(new Set(written.map((j) => j.claim))).toEqual(new Set(controls.map((c) => c.text)));
    for (const j of written)
      expect(controls.find((c) => c.text === j.claim)).toMatchObject({
        expect: j.expect,
        kind: j.kind,
      });
    const lines = [...replayLines(judgements), ...controlLines(judgements)];
    expect(lines.length).toBeGreaterThan(25);
    for (const line of lines) expect(published).toContain(line.trim());
  });
});

describe("written controls", () => {
  const control = (
    claim: string,
    replay: number,
    status: EntailmentStatus | null,
    expect: "supported" | "not-supported",
    kind = "says something the code contradicts",
  ): Judgement => ({ ...judged(claim, replay, status), kind, expect });

  it("reads a control with its kind and what it should get", () => {
    const text = JSON.stringify({
      controls: [
        {
          id: "case",
          kind: "gives a reason no source gives",
          expect: "not-supported",
          text: "Added to be faster.",
          citations: ["commit:a"],
          why: "invented",
        },
      ],
    });
    expect(parseControls(text)).toEqual([
      {
        id: "case",
        kind: "gives a reason no source gives",
        expect: "not-supported",
        text: "Added to be faster.",
        citations: ["commit:a"],
      },
    ]);
  });

  it("refuses a control with no expectation or no citation", () => {
    const broken = (c: object) => () => parseControls(JSON.stringify({ controls: [c] }));
    const full = { id: "a", kind: "k", expect: "supported", text: "t", citations: ["commit:a"] };
    expect(broken({ ...full, expect: "maybe" })).toThrow(/control 1 needs/);
    expect(broken({ ...full, citations: [] })).toThrow(/control 1 needs/);
    expect(parseControls("{}")).toEqual([]);
  });

  it("counts by kind how many judgements came out as expected, and names the misses", () => {
    const lines = controlLines([
      control("implements a check", 0, "unsupported", "not-supported"),
      control("implements a check", 1, "supported", "not-supported"),
      control("removes the method", 0, "weak", "not-supported"),
      control("added as documentation", 0, "supported", "supported", "true and backed"),
      control("added as documentation", 1, null, "supported", "true and backed"),
    ]);
    expect(lines).toEqual([
      "says something the code contradicts, expected not supported: 2 of 3 (67%) as expected. 1 supported, 1 weak, 1 unsupported; 0 errored.",
      '  missed 1 of 2: case, "implements a check"',
      "true and backed, expected supported: 1 of 1 (100%) as expected. 1 supported, 0 weak, 0 unsupported; 1 errored.",
    ]);
  });

  it("keeps controls out of the replay's own counts", () => {
    const mixed = [
      judged("kept", 0, "supported"),
      judged("kept", 1, "supported"),
      control("written", 0, "weak", "not-supported"),
      control("written", 1, "supported", "not-supported"),
    ];
    expect(replayCounts(mixed)).toMatchObject({ claims: 1, steady: 1, judged: 2 });
    expect(replayLines(mixed.filter((j) => j.kind))).toEqual([]);
  });

  it("holds only controls on cases of the gold set, each with a kind and an expectation", () => {
    const gold = JSON.parse(readFileSync("eval/gold.json", "utf8"));
    const ids = new Set(gold.cases.map((c: { id: string }) => c.id));
    const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
    expect(controls.length).toBeGreaterThan(20);
    for (const c of controls) expect(ids).toContain(c.id);
    expect(new Set(controls.map((c) => c.text)).size).toBe(controls.length);
    expect(controls.some((c) => c.expect === "supported")).toBe(true);
    expect(controls.some((c) => c.expect === "not-supported")).toBe(true);
  });
});
