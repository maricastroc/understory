import { describe, expect, it } from "vitest";
import type {
  Artifact,
  CitationCheck,
  Contradiction,
  Entailment,
  Evidence,
  Narrative,
} from "./types";
import { verify } from "./verify";

function art(id: string): Artifact {
  return { id, kind: "commit", title: id, body: "", url: "", date: "2024-01-01T00:00:00Z" };
}

function ev(ids: string[], contradictions: Contradiction[] = []): Evidence {
  return {
    question: "why is this line the way it is?",
    repo: { path: "/repo" },
    location: { file: "a.ts", startLine: 1, endLine: 1 },
    artifacts: ids.map(art),
    contradictions,
  };
}

const contra = (artifactId: string): Contradiction => ({
  artifactId,
  kind: "revert",
  detail: "undone",
});

function narr(partial: Partial<Narrative>): Narrative {
  return {
    answer: "because reasons",
    claims: [],
    citations: [],
    recorded: true,
    answerable: true,
    ...partial,
  };
}

const claim = (text: string, citations: string[]): Narrative["claims"][number] => ({
  text,
  citations,
});

describe("verify — grounding", () => {
  it("marks a narrative grounded when every citation was collected", () => {
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1"] }));
    expect(v.grounded).toBe(true);
    expect(v.unknownCitations).toEqual([]);
  });

  it("catches a fabricated citation the model invented", () => {
    const v = verify(ev(["c1"]), narr({ citations: ["c1", "ghost"] }));
    expect(v.grounded).toBe(false);
    expect(v.unknownCitations).toEqual(["ghost"]);
  });

  it("dedupes repeated citations before counting", () => {
    const v = verify(ev(["c1"]), narr({ citations: ["c1", "c1"] }));
    expect(v.grounded).toBe(true);
    expect(v.confidence.primarySources).toBe(1);
  });

  it("dedupes repeated fabrications", () => {
    const v = verify(ev([]), narr({ citations: ["ghost", "ghost"] }));
    expect(v.unknownCitations).toEqual(["ghost"]);
  });
});

describe("verify — confidence scoring", () => {
  it("a fabrication forces low confidence (0.2), even if recorded", () => {
    const v = verify(ev(["c1"]), narr({ citations: ["c1", "ghost"], recorded: true }));
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.2);
  });

  it("honest abstention (not recorded) is low (0.3)", () => {
    const v = verify(ev(["c1"]), narr({ citations: ["c1"], recorded: false }));
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.3);
  });

  it("recorded but with zero grounded sources is low (0.35)", () => {
    const v = verify(ev(["c1"]), narr({ citations: [], recorded: true }));
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.35);
  });

  it("a single grounded source without an audit is capped at medium (0.5)", () => {
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1"], recorded: true }));
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
  });

  it("grounded sources with no completed audit never reach high — capped at medium (0.5)", () => {
    // F6: HIGH is earned by the entailment pass, not by citation count. Without an
    // audit, even two grounded sources cap at medium; see the entailment block for HIGH.
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1", "c2"], recorded: true }));
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
  });

  it("corroborating = collected artifacts not cited as primary", () => {
    const v = verify(ev(["c1", "c2", "c3"]), narr({ citations: ["c1"], recorded: true }));
    expect(v.confidence.primarySources).toBe(1);
    expect(v.confidence.corroborating).toBe(2);
    expect(v.confidence.contradicting).toBe(0);
  });

  it("preserves the model's answer and recorded flag", () => {
    const v = verify(ev(["c1"]), narr({ answer: "line moved in a refactor", citations: ["c1"] }));
    expect(v.answer).toBe("line moved in a refactor");
    expect(v.recorded).toBe(true);
  });
});

describe("verify — contradiction penalty", () => {
  it("demotes a two-source HIGH to MEDIUM when one cited source is contradicted", () => {
    // Genuinely HIGH first (audited, both substantiated), so the contradiction has a
    // HIGH to soften rather than an already-capped medium.
    const v = verify(
      ev(["c1", "c2"], [contra("c1")]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.confidence.contradicting).toBe(1);
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.55);
  });

  it("drops to LOW when the reason is contradicted as much as it is supported", () => {
    const v = verify(ev(["c1"], [contra("c1")]), narr({ citations: ["c1"], recorded: true }));
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.3);
  });

  it("ignores a contradiction that hits an uncited artifact", () => {
    const v = verify(
      ev(["c1", "c2"], [contra("c2")]),
      narr({ citations: ["c1"], recorded: true }),
      entail([check("c1", "supported")]),
    );
    expect(v.confidence.contradicting).toBe(0);
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.65);
  });

  it("does not penalize an honest abstention", () => {
    const v = verify(ev(["c1"], [contra("c1")]), narr({ citations: ["c1"], recorded: false }));
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.3);
  });
});

const check = (citation: string, status: CitationCheck["status"]): CitationCheck => ({
  citation,
  status,
  quote: status === "supported" ? "verbatim proof" : null,
  reason: status,
});

function entail(checks: CitationCheck[]): Entailment {
  return {
    checked: true,
    checks,
    supported: checks.filter((c) => c.status === "supported").length,
    misattributed: checks.filter((c) => c.status === "unsupported").length,
  };
}

describe("verify — entailment refines confidence", () => {
  it("keeps HIGH when both cited sources are substantiated in-source", () => {
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.confidence.level).toBe("high");
    expect(v.entailment?.supported).toBe(2);
    expect(v.entailment?.misattributed).toBe(0);
  });

  it("demotes HIGH to MEDIUM when one cited source does not substantiate the claim", () => {
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "unsupported")]),
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.entailment?.misattributed).toBe(1);
    expect(v.confidence.primarySources).toBe(2);
  });

  it("drops a lone misattributed citation to LOW even though its id is real", () => {
    const v = verify(
      ev(["c1"]),
      narr({ citations: ["c1"], recorded: true }),
      entail([check("c1", "unsupported")]),
    );
    expect(v.grounded).toBe(true);
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.35);
  });

  it("does not let a 'weak' source count toward HIGH — one supported + one weak is medium (0.65)", () => {
    // F5: only quote-verified "supported" sources earn HIGH. A weak source is real and
    // on-topic (it does not lower confidence), but it cannot be the second pillar of HIGH.
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "weak")]),
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.65);
    expect(v.entailment?.misattributed).toBe(0);
  });

  it("weak-only support is medium, never high (0.55)", () => {
    // F5: on-topic sources with no single line that proves the point stay medium.
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "weak"), check("c2", "weak")]),
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.55);
    expect(v.entailment?.supported).toBe(0);
    expect(v.entailment?.misattributed).toBe(0);
  });

  it("caps confidence at medium when the judge did not run (checked:false)", () => {
    // F6: an audit that produced no verdicts cannot certify support, so it cannot certify
    // HIGH. The result degrades to medium and the entailment block is dropped entirely.
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      { checked: false, checks: [], supported: 0, misattributed: 0 },
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
    expect(v.entailment).toBeUndefined();
  });

  it("caps confidence at medium when the entailment pass threw (undefined)", () => {
    // F6: the orchestrator passes undefined when checkEntailment throws (e.g. rate limit).
    // Grounded, but unverified — never HIGH.
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1", "c2"], recorded: true }));
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
    expect(v.entailment).toBeUndefined();
  });
});

describe("verify — uncited claims (F1)", () => {
  it("marks each claim grounded or not against the collected ids", () => {
    const v = verify(
      ev(["c1", "c2"]),
      narr({
        claims: [claim("backed by a real commit", ["c1"]), claim("cites nothing", [])],
        citations: ["c1"],
        recorded: true,
      }),
    );
    expect(v.claims.map((c) => c.grounded)).toEqual([true, false]);
    expect(v.ungroundedClaims).toBe(1);
  });

  it("a minority of uncited claims caps a would-be HIGH at medium", () => {
    // Two substantiated sources would score HIGH; one stray uncited sentence forbids it.
    const v = verify(
      ev(["c1", "c2"]),
      narr({
        claims: [claim("A", ["c1"]), claim("B", ["c2"]), claim("uncited aside", [])],
        citations: ["c1", "c2"],
        recorded: true,
      }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.ungroundedClaims).toBe(1);
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.55);
  });

  it("an answer at least half uncited drops to LOW", () => {
    const v = verify(
      ev(["c1"]),
      narr({
        claims: [claim("A", ["c1"]), claim("uncited 1", []), claim("uncited 2", [])],
        citations: ["c1"],
        recorded: true,
      }),
      entail([check("c1", "supported")]),
    );
    expect(v.ungroundedClaims).toBe(2);
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.4);
  });

  it("leaves a fully-cited answer untouched (no ungrounded claims)", () => {
    const v = verify(
      ev(["c1", "c2"]),
      narr({
        claims: [claim("A", ["c1"]), claim("B", ["c2"])],
        citations: ["c1", "c2"],
        recorded: true,
      }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.ungroundedClaims).toBe(0);
    expect(v.confidence.level).toBe("high");
  });

  it("a claim citing only a fabricated id is caught by the fabrication gate first (low 0.2)", () => {
    const v = verify(
      ev(["c1"]),
      narr({ claims: [claim("invented", ["ghost"])], citations: ["ghost"], recorded: true }),
    );
    expect(v.grounded).toBe(false);
    expect(v.claims[0].grounded).toBe(false);
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.2);
  });
});

describe("verify — a claim is the unit of confidence (F3)", () => {
  it("counts a single multi-source claim once — a composed claim can't reach HIGH alone", () => {
    // Two supported citations would have scored HIGH under per-citation counting; but both
    // belong to ONE claim ("A because B"), so the causal claim counts once → medium.
    const v = verify(
      ev(["a", "b"]),
      narr({
        claims: [claim("A was added because of B", ["a", "b"])],
        citations: ["a", "b"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "a", claim: 0, status: "supported", quote: "proof", reason: "" },
          { citation: "b", claim: 0, status: "supported", quote: null, reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.65);
  });

  it("two independently-substantiated claims reach HIGH", () => {
    const v = verify(
      ev(["a", "b"]),
      narr({
        claims: [claim("A", ["a"]), claim("B", ["b"])],
        citations: ["a", "b"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 2,
        misattributed: 0,
        checks: [
          { citation: "a", claim: 0, status: "supported", quote: "proof", reason: "" },
          { citation: "b", claim: 1, status: "supported", quote: "proof", reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.9);
  });

  it("a multi-source claim the judge could not prove (weak) is on-topic but not HIGH", () => {
    const v = verify(
      ev(["a", "b"]),
      narr({
        claims: [claim("A because B", ["a", "b"])],
        citations: ["a", "b"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 0,
        misattributed: 0,
        checks: [
          { citation: "a", claim: 0, status: "weak", quote: null, reason: "link not stated" },
          { citation: "b", claim: 0, status: "weak", quote: null, reason: "link not stated" },
        ],
      },
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.55);
  });
});
