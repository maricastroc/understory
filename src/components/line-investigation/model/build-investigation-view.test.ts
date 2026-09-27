import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "./build-investigation-view";

const now = new Date(SYNTHETIC_NOW);
const view = (result = syntheticRetryCap, pending = false) =>
  buildInvestigationView(result, { now, pending });

describe("buildInvestigationView — resolved retry-cap case", () => {
  const v = view();

  it("resolves, keeps the question, location and the pinned sha", () => {
    expect(v.verdict).toBe("resolved");
    expect(v.question).toBe("Why exactly 3 retries?");
    expect(v.location).toEqual({ file: "src/billing/charge.ts", startLine: 9, endLine: 9 });
    expect(v.pinnedSha).toBe("4e1d0a2".padEnd(40, "0"));
    expect(v.granularity).toBe("line");
  });

  it("letters artifacts by depth — shallowest is A — with a stable order", () => {
    expect(v.artifacts.map((a) => [a.letter, a.id])).toEqual([
      ["A", "commit:92f6a3f"],
      ["B", "review:812-1"],
      ["C", "review:812-0"],
      ["D", "pr:812"],
      ["E", "issue:1187"],
      ["F", "commit:7be210e"],
    ]);
    expect(view().artifacts.map((a) => a.letter)).toEqual(v.artifacts.map((a) => a.letter));
  });

  it("measures depth from the reference time, not from the line's last change", () => {
    const a = v.artifacts.find((x) => x.id === "commit:92f6a3f")!;
    expect(a.daysBeforeNow).toBeCloseTo(
      (Date.parse(SYNTHETIC_NOW) - Date.parse("2023-03-15T16:20:00Z")) / 86_400_000,
      6,
    );
    expect(a.daysBeforeNow! / 365.25).toBeCloseTo(3.54, 2);
  });

  it("uses the real clause text and keeps citation order in the letters", () => {
    expect(v.clauses.map((c) => [c.id, c.letters])).toEqual([
      ["c0", ["A", "D"]],
      ["c1", ["E", "D"]],
      ["c2", ["B", "C"]],
    ]);
    expect(v.clauses[0].text).toBe("Capped at three attempts, with 1 s · 2 s · 4 s backoff.");
    expect(v.clauses.every((c) => !c.silent && c.audit === "supported")).toBe(true);
  });

  it("gives each clause exactly one verified cell — the source that carries its quote", () => {
    expect(v.clauses.map((c) => c.cells.map((k) => k.state))).toEqual([
      ["verified", "cited"],
      ["verified", "cited"],
      ["verified", "cited"],
    ]);
  });

  it("marks cited vs supporting artifacts and who cites them", () => {
    const pr = v.artifacts.find((a) => a.id === "pr:812")!;
    expect(pr.role).toBe("cited");
    expect(pr.citedBy).toEqual(["c0", "c1"]);
    expect(pr.verified).toBe(false);
    const old = v.artifacts.find((a) => a.id === "commit:7be210e")!;
    expect(old.role).toBe("supporting");
    expect(old.citedBy).toEqual([]);
    expect(old.onBore).toBe(true);
  });

  it("maps every verified quote onto an exact span of its source body", () => {
    for (const a of v.artifacts) {
      for (const q of a.quotes) {
        const span = a.source.body.slice(q.range!.start, q.range!.end);
        expect(span.toLowerCase().replace(/\s+/g, " ")).toBe(q.text.toLowerCase());
      }
    }
    expect(v.artifacts.find((a) => a.id === "issue:1187")?.quotes).toEqual([
      expect.objectContaining({ clauseId: "c1", text: "212 customers were charged twice" }),
    ]);
  });

  it("exposes PR interval, review state and lookup outcomes from stage-4 data", () => {
    expect(v.artifacts.find((a) => a.id === "pr:812")?.endDate).toBe("2023-03-15T16:20:00Z");
    expect(v.artifacts.find((a) => a.id === "review:812-1")?.reviewState).toBe("CHANGES_REQUESTED");
    expect(v.artifacts.find((a) => a.id === "commit:7be210e")?.prLookup).toBe("none");
  });

  it("derives the only gap that the record supports: no PR behind the direct commit", () => {
    expect(v.gaps).toEqual([
      {
        id: "gap:pull_request:commit:7be210e",
        missing: "pull_request",
        afterId: "commit:7be210e",
        verified: true,
        basis: "searched",
      },
    ]);
  });

  it("counts chain links as filled + gaps (5 of 6)", () => {
    expect(v.links).toEqual({ filled: 5, gaps: 1, unverified: 0 });
  });

  it("builds the verdict checklist from the checks, with confidence kept separate", () => {
    expect(v.checklist).toEqual([
      { kind: "clauses-grounded", tone: "ok", grounded: 3, total: 3 },
      { kind: "citations-resolved", tone: "ok", resolved: 5, total: 5, unknown: [] },
      { kind: "quotes", tone: "ok", verified: 3, weak: 0, misattributed: 0, unaudited: 0 },
    ]);
    expect(v.confidence).toMatchObject({ level: "high", score: 0.9 });
  });
});

describe("buildInvestigationView — verdict states", () => {
  it("reports pending while the synthesis is still running", () => {
    expect(view(states.syntheticEvidenceOnly(), true).verdict).toBe("pending");
  });

  it("keeps the bore and the error when only evidence came back", () => {
    const v = view(states.syntheticEvidenceOnly());
    expect(v.verdict).toBe("evidence-only");
    expect(v.clauses).toEqual([]);
    expect(v.artifacts).toHaveLength(6);
    expect(v.gaps).toHaveLength(1);
    expect(v.error).toMatch(/rate-limited/);
    expect(v.checklist[0]).toMatchObject({ kind: "evidence-only", tone: "scope" });
  });

  it("renders a whole-answer abstention as one silent clause with no letters and no trace", () => {
    const v = view(states.syntheticNotRecorded());
    expect(v.verdict).toBe("not-recorded");
    expect(v.clauses).toEqual([
      expect.objectContaining({
        silent: true,
        text: "The history does not explain why the charge is retried at all.",
        letters: [],
        citations: [],
        cells: [],
      }),
    ]);
    expect(v.artifacts.every((a) => a.role === "supporting")).toBe(true);
    expect(v.checklist[0]).toMatchObject({ kind: "not-recorded", tone: "silent" });
  });

  it("has an explicit out-of-scope state with the model's one-line answer", () => {
    const v = view(states.syntheticOutOfScope());
    expect(v.verdict).toBe("out-of-scope");
    expect(v.clauses).toEqual([]);
    expect(v.checklist).toEqual([
      {
        kind: "out-of-scope",
        tone: "scope",
        answer: "This question is outside what this code's history can answer.",
      },
    ]);
  });

  it("catches fabrication and keeps the unknown id instead of inventing a letter", () => {
    const v = view(states.syntheticFabricated());
    expect(v.verdict).toBe("fabrication");
    const bad = v.clauses[1];
    expect(bad.unknownCitations).toEqual(["commit:deadbee"]);
    expect(bad.letters).toEqual(["D"]);
    expect(bad.cells[0]).toEqual({ citation: "commit:deadbee", letter: null, state: "unknown" });
    expect(v.checklist).toContainEqual(
      expect.objectContaining({ kind: "citations-resolved", unknown: ["commit:deadbee"] }),
    );
  });

  it("flags a claim that cites nothing real as uncited", () => {
    const v = view(states.syntheticUncited());
    expect(v.clauses[1].grounded).toBe(false);
    expect(v.checklist).toContainEqual({ kind: "uncited-claims", tone: "caveat", count: 1 });
    expect(v.checklist[0]).toEqual({
      kind: "clauses-grounded",
      tone: "caveat",
      grounded: 1,
      total: 2,
    });
  });

  it("shows a misattributed clause without claiming a verified quote", () => {
    const v = view(states.syntheticMisattributed());
    expect(v.clauses[2].audit).toBe("unsupported");
    expect(v.clauses[2].cells.map((c) => c.state)).toEqual(["misattributed", "misattributed"]);
    expect(v.artifacts.find((a) => a.id === "review:812-1")?.verified).toBe(false);
    expect(v.checklist).toContainEqual(
      expect.objectContaining({ kind: "quotes", misattributed: 1, tone: "caveat" }),
    );
  });

  it("keeps weak as its own state", () => {
    const v = view(states.syntheticWeak());
    expect(v.clauses[1].audit).toBe("weak");
    expect(v.clauses[1].cells.map((c) => c.state)).toEqual(["weak", "weak"]);
    expect(v.checklist).toContainEqual(expect.objectContaining({ kind: "quotes", weak: 1 }));
  });

  it("says the audit was unavailable instead of dressing claims as verified", () => {
    const v = view(states.syntheticUnaudited());
    expect(v.clauses.every((c) => c.audit === "unaudited")).toBe(true);
    expect(v.clauses.flatMap((c) => c.cells.map((k) => k.state))).not.toContain("verified");
    expect(v.artifacts.some((a) => a.verified)).toBe(false);
    expect(v.checklist).toContainEqual({ kind: "audit-unavailable", tone: "caveat" });
  });

  it("marks claims past the audit cap as unaudited", () => {
    const v = view(states.syntheticBeyondAuditCap());
    expect(v.clauses.map((c) => c.audit)).toEqual([
      "supported",
      "supported",
      "supported",
      "weak",
      "weak",
      "weak",
      "unaudited",
      "unaudited",
    ]);
    expect(v.checklist).toContainEqual(
      expect.objectContaining({ kind: "quotes", verified: 3, weak: 3, unaudited: 2 }),
    );
  });

  it("surfaces contradictions on cited sources", () => {
    const v = view(states.syntheticContradicted());
    expect(v.checklist).toContainEqual({
      kind: "contradictions",
      tone: "caveat",
      items: [
        {
          artifactId: "pr:812",
          by: "commit:0badc0d",
          kind: "revert",
          detail: "Reverted by 0badc0d",
        },
      ],
    });
  });
});

describe("buildInvestigationView — gaps are only drawn when the record supports them", () => {
  it("treats pre-stage-4 cases as unverified and hides N of M", () => {
    const v = view(states.syntheticWithoutStageFourData());
    expect(v.pinnedSha).toBeNull();
    expect(v.gaps).toEqual([
      expect.objectContaining({ missing: "pull_request", verified: false, basis: "unknown" }),
    ]);
    expect(v.links).toEqual({ filled: 5, gaps: 1, unverified: 1 });
  });

  it("never turns an unsearched commit into 'not recorded'", () => {
    const v = view(states.syntheticCommitsOnly());
    expect(v.gaps.map((g) => [g.afterId, g.verified, g.basis])).toEqual([
      ["commit:92f6a3f", false, "skipped"],
      ["commit:7be210e", false, "skipped"],
    ]);
    expect(v.links).toBeNull();
  });

  it("does not invent a missing review when the PR was reviewed without text", () => {
    const base = states.syntheticEvidenceOnly();
    const artifacts = base.evidence.artifacts.filter((a) => a.kind !== "review");
    const v = view({ ...base, evidence: { ...base.evidence, artifacts } });
    expect(v.gaps.some((g) => g.missing === "review")).toBe(false);
  });

  it("marks a missing review as searched when the provider returned none", () => {
    const base = states.syntheticEvidenceOnly();
    const artifacts = base.evidence.artifacts
      .filter((a) => a.kind !== "review")
      .map((a) => (a.id === "pr:812" ? { ...a, meta: { ...a.meta, reviewLookup: "none" } } : a));
    const v = view({ ...base, evidence: { ...base.evidence, artifacts } });
    expect(v.gaps).toContainEqual(
      expect.objectContaining({ missing: "review", afterId: "pr:812", verified: true }),
    );
  });

  it("keeps file-level history off the bore unless it is cited or next to a citation", () => {
    const v = view(states.syntheticFileGranularity());
    expect(v.granularity).toBe("file");
    expect(v.artifacts.find((a) => a.id === "commit:7be210e")?.onBore).toBe(false);
    expect(v.artifacts.filter((a) => a.onBore).map((a) => a.letter)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(v.gaps).toEqual([]);
    expect(v.checklist).toContainEqual(
      expect.objectContaining({
        kind: "file-granularity",
        note: expect.stringMatching(/blame API/),
      }),
    );
  });
});

describe("buildInvestigationView — legacy saved cases", () => {
  it("draws no gaps and no link count without chain edges", () => {
    const v = view(states.syntheticLegacyNoEdges());
    expect(v.gaps).toEqual([]);
    expect(v.links).toBeNull();
    expect(v.clauses).toHaveLength(3);
  });

  it("keeps per-citation quotes but does not pretend clauses were audited one by one", () => {
    const v = view(states.syntheticLegacyCitationChecks());
    expect(v.clauses.every((c) => c.audit === "unaudited")).toBe(true);
    const commit = v.artifacts.find((a) => a.id === "commit:92f6a3f")!;
    expect(commit.verified).toBe(true);
    expect(commit.quotes[0].clauseId).toBeNull();
  });

  it("falls back to the answer as one legacy clause when claims are missing", () => {
    const v = view(states.syntheticLegacyNoClaims());
    expect(v.clauses).toHaveLength(1);
    expect(v.clauses[0]).toMatchObject({ legacy: true, audit: "unaudited", silent: false });
    expect(v.clauses[0].letters.sort()).toEqual(["A", "B", "C", "D", "E"]);
  });
});

describe("buildInvestigationView — robustness", () => {
  it("letters more than 26 artifacts without running into punctuation", () => {
    const v = view(states.syntheticManyArtifacts(30));
    const letters = v.artifacts.map((a) => a.letter);
    expect(letters).toHaveLength(36);
    expect(new Set(letters).size).toBe(36);
    expect(letters.every((l) => /^[A-Z]+$/.test(l))).toBe(true);
  });

  it("refuses a quote that is not actually in its source", () => {
    const base = syntheticRetryCap;
    const tampered = {
      ...base,
      narrative: {
        ...base.narrative!,
        entailment: {
          ...base.narrative!.entailment!,
          checks: base.narrative!.entailment!.checks.map((c) =>
            c.citation === "issue:1187" ? { ...c, quote: "214 customers were charged twice" } : c,
          ),
        },
      },
    };
    const v = view(tampered);
    expect(v.artifacts.find((a) => a.id === "issue:1187")?.verified).toBe(false);
    expect(v.clauses[1].cells[0].state).toBe("cited");
  });

  it("keeps artifacts with an unparseable date off the bore instead of guessing a depth", () => {
    const base = syntheticRetryCap;
    const artifacts = base.evidence.artifacts.map((a) =>
      a.id === "commit:7be210e" ? { ...a, date: "" } : a,
    );
    const v = view({ ...base, evidence: { ...base.evidence, artifacts } });
    const old = v.artifacts.find((a) => a.id === "commit:7be210e")!;
    expect(old.daysBeforeNow).toBeNull();
    expect(old.onBore).toBe(false);
    expect(v.artifacts[v.artifacts.length - 1].id).toBe("commit:7be210e");
  });
});
