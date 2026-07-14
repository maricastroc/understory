import { describe, expect, it } from "vitest";
import type { Artifact, Contradiction, Entailment } from "../types";
import { collectionToResult, verifyDiff } from "./verify";
import type { DiffCluster, DiffCollection, DiffNarrative, LineRange } from "./types";

const range = (s: number, e: number): LineRange => ({ start: s, end: e });
const art = (id: string, kind: Artifact["kind"] = "commit"): Artifact => ({
  id,
  kind,
  title: id,
  body: "",
  url: "",
  date: "2024-01-01T00:00:00Z",
});

function cluster(over: Partial<DiffCluster> = {}): DiffCluster {
  return {
    commitId: "commit:c1",
    targets: [{ path: "a.ts", range: range(6, 6) }],
    artifacts: [art("commit:c1")],
    contradictions: [],
    rank: 0,
    ...over,
  };
}

function collection(clusters: DiffCluster[]): DiffCollection {
  return {
    repo: { path: "o/r", name: "r" },
    pr: { number: 1, title: "t", url: "u", baseSha: "b", headSha: "h" },
    clusters,
    triage: {
      filesChanged: 1,
      filesConsidered: 1,
      filesSkipped: 0,
      targetsBlamed: 1,
      clustersFound: clusters.length,
      clustersDetailed: clusters.length,
      truncated: false,
    },
  };
}

const narr = (findings: DiffNarrative["findings"], summary = "s"): DiffNarrative => ({
  summaryClaims: summary ? [{ text: summary, citations: [] }] : [],
  findings,
});

describe("verifyDiff — grounding", () => {
  it("keeps a finding whose citations all resolve, grounded and recorded", () => {
    const col = collection([
      cluster({ artifacts: [art("commit:c1"), art("pr:9", "pull_request")] }),
    ]);
    const res = verifyDiff(
      col,
      narr([
        { cluster: "C1", why: "caps retries", citations: ["commit:c1", "pr:9"], recorded: true },
      ]),
    );
    expect(res.summary).toBe("s");
    expect(res.findings).toHaveLength(1);
    expect(res.findings[0]).toMatchObject({
      ref: "C1",
      why: "caps retries",
      citations: ["commit:c1", "pr:9"],
      unknownCitations: [],
      grounded: true,
      recorded: true,
    });

    expect(res.findings[0].confidence.level).toBe("medium");
  });

  it("flags a fabricated citation and drops to LOW", () => {
    const res = verifyDiff(
      collection([cluster()]),
      narr([{ cluster: "C1", why: "x", citations: ["commit:c1", "commit:ghost"], recorded: true }]),
    );
    expect(res.findings[0].unknownCitations).toEqual(["commit:ghost"]);
    expect(res.findings[0].grounded).toBe(false);
    expect(res.findings[0].confidence.level).toBe("low");
  });

  it("matches region refs tolerant of case and whitespace", () => {
    const res = verifyDiff(
      collection([cluster()]),
      narr([{ cluster: " c1 ", why: "ok", citations: ["commit:c1"], recorded: true }]),
    );
    expect(res.findings[0].why).toBe("ok");
  });
});

describe("verifyDiff — abstention & silence", () => {
  it("marks a region the model did not address as silent (recorded false)", () => {
    const res = verifyDiff(collection([cluster()]), narr([]));
    expect(res.findings[0]).toMatchObject({
      why: "",
      recorded: false,
      grounded: true,
      citations: [],
    });
    expect(res.findings[0].confidence.score).toBe(0.3);
  });

  it("honors the model's own recorded=false", () => {
    const res = verifyDiff(
      collection([cluster()]),
      narr([
        { cluster: "C1", why: "the history doesn't explain it", citations: [], recorded: false },
      ]),
    );
    expect(res.findings[0].recorded).toBe(false);
  });

  it("produces one finding per cluster, in order", () => {
    const col = collection([cluster({ commitId: "commit:a" }), cluster({ commitId: "commit:b" })]);
    const res = verifyDiff(
      col,
      narr([{ cluster: "C2", why: "second", citations: [], recorded: true }]),
    );
    expect(res.findings.map((f) => f.ref)).toEqual(["C1", "C2"]);
    expect(res.findings[1].why).toBe("second");
  });
});

describe("verifyDiff — contradiction penalty", () => {
  it("downgrades a finding whose cited source was later contradicted", () => {
    const contra: Contradiction = { artifactId: "commit:c1", kind: "revert", detail: "reverted" };
    const col = collection([cluster({ contradictions: [contra] })]);
    const res = verifyDiff(
      col,
      narr([{ cluster: "C1", why: "x", citations: ["commit:c1"], recorded: true }]),
    );
    expect(res.findings[0].confidence.level).toBe("low");
  });
});

describe("verifyDiff — entailment (parity with the line flow)", () => {
  const twoSources = () =>
    collection([cluster({ artifacts: [art("commit:c1"), art("pr:9", "pull_request")] })]);
  const both = (): DiffNarrative["findings"] => [
    { cluster: "C1", why: "caps retries", citations: ["commit:c1", "pr:9"], recorded: true },
  ];
  const entail = (checks: Entailment["checks"]): Map<string, Entailment> =>
    new Map([
      [
        "C1",
        {
          checked: true,
          checks,
          supported: checks.filter((c) => c.status === "supported").length,
          misattributed: checks.filter((c) => c.status === "unsupported").length,
        },
      ],
    ]);

  it("demotes a finding when the judge finds a cited source unsupported", () => {
    const res = verifyDiff(
      twoSources(),
      narr(both()),
      entail([
        { citation: "commit:c1", status: "supported", quote: "caps retries", reason: "" },
        { citation: "pr:9", status: "unsupported", quote: null, reason: "about something else" },
      ]),
    );

    expect(res.findings[0].confidence.level).toBe("medium");
    expect(res.findings[0].entailment?.misattributed).toBe(1);
  });

  it("leaves confidence untouched when every cited source is substantiated", () => {
    const res = verifyDiff(
      twoSources(),
      narr(both()),
      entail([
        { citation: "commit:c1", status: "supported", quote: "caps retries", reason: "" },
        { citation: "pr:9", status: "supported", quote: "caps retries", reason: "" },
      ]),
    );
    expect(res.findings[0].confidence.level).toBe("high");
  });

  it("caps an unaudited finding at medium — HIGH requires the audit (F6)", () => {
    const res = verifyDiff(twoSources(), narr(both()));
    expect(res.findings[0].confidence.level).toBe("medium");
    expect(res.findings[0].confidence.score).toBe(0.5);
    expect(res.findings[0].entailment).toBeUndefined();
  });

  it("keeps weak-only support at medium, never high (F5)", () => {
    const res = verifyDiff(
      twoSources(),
      narr(both()),
      entail([
        { citation: "commit:c1", status: "weak", quote: null, reason: "on-topic" },
        { citation: "pr:9", status: "weak", quote: null, reason: "on-topic" },
      ]),
    );
    expect(res.findings[0].confidence.level).toBe("medium");
    expect(res.findings[0].entailment?.supported).toBe(0);
    expect(res.findings[0].entailment?.misattributed).toBe(0);
  });
});

describe("verifyDiff — summary grounding (F1 parity)", () => {
  it("grounds each summary claim and derives the summary prose from them", () => {
    const col = collection([cluster({ artifacts: [art("commit:c1")] })]);
    const res = verifyDiff(col, {
      summaryClaims: [
        { text: "The retry cap was added after an outage.", citations: ["commit:c1"] },
        { text: "An aside with no source.", citations: [] },
      ],
      findings: [],
    });
    expect(res.summary).toBe("The retry cap was added after an outage. An aside with no source.");
    expect(res.summaryClaims.map((c) => c.grounded)).toEqual([true, false]);
  });

  it("flags a summary claim that cites nothing real as ungrounded", () => {
    const col = collection([cluster({ artifacts: [art("commit:c1")] })]);
    const res = verifyDiff(col, {
      summaryClaims: [{ text: "invented", citations: ["commit:ghost"] }],
      findings: [],
    });
    expect(res.summaryClaims[0].grounded).toBe(false);
  });

  it("attaches the summary entailment when the judge ran", () => {
    const col = collection([cluster({ artifacts: [art("commit:c1")] })]);
    const res = verifyDiff(
      col,
      { summaryClaims: [{ text: "x", citations: ["commit:c1"] }], findings: [] },
      undefined,
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [{ citation: "commit:c1", claim: 0, status: "supported", quote: "q", reason: "" }],
      },
    );
    expect(res.summaryEntailment?.supported).toBe(1);
  });
});

describe("collectionToResult — evidence only", () => {
  it("returns every region silent with the error attached", () => {
    const res = collectionToResult(
      collection([cluster(), cluster()]),
      "No language model is configured.",
    );
    expect(res.error).toBe("No language model is configured.");
    expect(res.findings).toHaveLength(2);
    expect(res.findings.every((f) => f.recorded === false && f.why === "")).toBe(true);
  });
});
