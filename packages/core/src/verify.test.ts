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
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1", "c2"], recorded: true }), {
      checked: false,
      checks: [],
      supported: 0,
      misattributed: 0,
    });
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
    expect(v.entailment).toBeUndefined();
  });

  it("caps confidence at medium when the entailment pass threw (undefined)", () => {
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

describe("verify — collection granularity (F2)", () => {
  const coarse = (ids: string[]): Evidence => ({
    ...ev(ids),
    coverage: { granularity: "file" },
  });

  it("caps a would-be HIGH at medium when only file-level history was available", () => {
    const v = verify(
      coarse(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.55);
  });

  it("leaves line-level evidence (the default) at HIGH", () => {
    const v = verify(
      ev(["c1", "c2"]),
      narr({ citations: ["c1", "c2"], recorded: true }),
      entail([check("c1", "supported"), check("c2", "supported")]),
    );
    expect(v.confidence.level).toBe("high");
  });

  it("only caps — it never lowers an already-medium answer further", () => {
    const v = verify(
      coarse(["c1"]),
      narr({ citations: ["c1"], recorded: true }),
      entail([check("c1", "supported")]),
    );
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.65);
  });
});

describe("verify — the owning change explains itself (provenance HIGH)", () => {
  const owner = (id: string): Artifact => ({ ...art(id), date: "2024-06-01T00:00:00Z" });

  function evWith(artifacts: Artifact[]): Evidence {
    return {
      question: "why is this line the way it is?",
      repo: { path: "/repo" },
      location: { file: "a.ts", startLine: 1, endLine: 1 },
      artifacts,
      contradictions: [],
    };
  }

  it("a claim citing only the owning commit, substantiated verbatim, reaches HIGH alone", () => {
    const v = verify(
      evWith([owner("commit:o"), art("commit:other")]),
      narr({
        claims: [claim("the owning commit states the rationale", ["commit:o"])],
        citations: ["commit:o"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "commit:o", claim: 0, status: "supported", quote: "proof", reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.85);
  });

  it("a claim citing the owning commit's PR, substantiated verbatim, reaches HIGH", () => {
    const pr: Artifact = {
      id: "pr:5",
      kind: "pull_request",
      title: "PR",
      body: "",
      url: "",
      date: "2024-06-01T00:00:00Z",
      parentId: "commit:o",
    };
    const v = verify(
      evWith([owner("commit:o"), pr]),
      narr({
        claims: [claim("the PR explains why the line was added", ["pr:5"])],
        citations: ["pr:5"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [{ citation: "pr:5", claim: 0, status: "supported", quote: "proof", reason: "" }],
      },
    );
    expect(v.confidence.level).toBe("high");
  });

  it("reproduces the dotenv case: owning commit substantiated + PR weak → HIGH", () => {
    const commit: Artifact = { ...art("commit:b8275a0"), date: "2024-01-20T15:05:00Z" };
    const pr: Artifact = {
      id: "pr:469",
      kind: "pull_request",
      title: "…",
      body: "",
      url: "",
      date: "2024-01-20T20:07:00Z",
      parentId: "commit:b8275a0",
    };
    const v = verify(
      evWith([commit, pr]),
      narr({
        claims: [
          claim("a commit consistently uses 'overwrite' in place of 'overload'", [
            "commit:b8275a0",
          ]),
          claim("the PR keeps overload as an undocumented alias", ["pr:469"]),
        ],
        citations: ["commit:b8275a0", "pr:469"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          {
            citation: "commit:b8275a0",
            claim: 0,
            status: "supported",
            quote: "Consistently use",
            reason: "",
          },
          {
            citation: "pr:469",
            claim: 1,
            status: "weak",
            quote: null,
            reason: "on topic, not stated",
          },
        ],
      },
    );
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.85);
  });

  it("does not reach HIGH on the owner alone when another citation is misattributed", () => {
    const v = verify(
      evWith([owner("commit:o"), art("commit:bad")]),
      narr({
        claims: [
          claim("the owning commit states the rationale", ["commit:o"]),
          claim("and this source caused it", ["commit:bad"]),
        ],
        citations: ["commit:o", "commit:bad"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 1,
        checks: [
          { citation: "commit:o", claim: 0, status: "supported", quote: "proof", reason: "" },
          {
            citation: "commit:bad",
            claim: 1,
            status: "unsupported",
            quote: null,
            reason: "off-topic",
          },
        ],
      },
    );
    expect(v.confidence.level).toBe("medium");
  });

  it("a composed claim leaning on the owner AND another source stays medium — needs two independent sources", () => {
    const v = verify(
      evWith([owner("commit:o"), art("commit:two")]),
      narr({
        claims: [claim("the line exists because of the other change", ["commit:o", "commit:two"])],
        citations: ["commit:o", "commit:two"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "commit:o", claim: 0, status: "supported", quote: "proof", reason: "" },
          { citation: "commit:two", claim: 0, status: "supported", quote: null, reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("medium");
  });

  it("stays medium when only file-level history was available, even if the owner is substantiated", () => {
    const base = evWith([owner("commit:o")]);
    const v = verify(
      { ...base, coverage: { granularity: "file" } },
      narr({
        claims: [claim("the owning commit states the rationale", ["commit:o"])],
        citations: ["commit:o"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "commit:o", claim: 0, status: "supported", quote: "proof", reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("medium");
  });

  it("demotes an owner-substantiated HIGH to LOW when the owning commit was reverted", () => {
    const v = verify(
      {
        ...evWith([owner("commit:o")]),
        contradictions: [{ artifactId: "commit:o", kind: "revert", detail: "undone" }],
      },
      narr({
        claims: [claim("the owning commit states the rationale", ["commit:o"])],
        citations: ["commit:o"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "commit:o", claim: 0, status: "supported", quote: "proof", reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("low");
  });
});

describe("verify — bare commit shas from the model", () => {
  it("grounds a bare sha that names exactly one collected commit and returns it canonical", () => {
    const v = verify(
      ev(["commit:c319fe2", "pr:2237"]),
      narr({
        claims: [claim("the polyfill shipped in 4.15.4", ["c319fe2"])],
        citations: ["c319fe2"],
        recorded: true,
      }),
    );
    expect(v.grounded).toBe(true);
    expect(v.unknownCitations).toEqual([]);
    expect(v.citations).toEqual(["commit:c319fe2"]);
    expect(v.claims[0]).toMatchObject({ citations: ["commit:c319fe2"], grounded: true });
  });

  it("still treats a bare sha that matches no collected commit as a fabrication", () => {
    const v = verify(
      ev(["commit:c319fe2"]),
      narr({ claims: [claim("invented", ["deadbee"])], citations: ["deadbee"], recorded: true }),
    );
    expect(v.grounded).toBe(false);
    expect(v.unknownCitations).toEqual(["deadbee"]);
    expect(v.confidence.level).toBe("low");
    expect(v.confidence.score).toBe(0.2);
  });

  it("still treats an ambiguous bare sha as a fabrication", () => {
    const v = verify(
      ev(["commit:abc1234aa", "commit:abc1234bb"]),
      narr({ claims: [claim("which one?", ["abc1234"])], citations: ["abc1234"], recorded: true }),
    );
    expect(v.grounded).toBe(false);
    expect(v.unknownCitations).toEqual(["abc1234"]);
  });

  it("lets a claim that cites the owning commit by bare sha reach the provenance HIGH", () => {
    const owner: Artifact = { ...art("commit:0a1b2c3"), date: "2024-06-01T00:00:00Z" };
    const v = verify(
      { ...ev([]), artifacts: [owner, art("commit:other")] },
      narr({
        claims: [claim("the owning commit states the rationale", ["0a1b2c3"])],
        citations: ["0a1b2c3"],
        recorded: true,
      }),
      {
        checked: true,
        supported: 1,
        misattributed: 0,
        checks: [
          { citation: "commit:0a1b2c3", claim: 0, status: "supported", quote: "proof", reason: "" },
        ],
      },
    );
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.85);
  });
});

describe("verify — auditor failures stay visible", () => {
  it("keeps an entailment whose every check failed, so the failure is not dropped", () => {
    const v = verify(ev(["c1"]), narr({ citations: ["c1"], recorded: true }), {
      checked: false,
      checks: [],
      supported: 0,
      misattributed: 0,
      failed: 1,
      fallbacks: 0,
    });
    expect(v.entailment).toMatchObject({ checked: false, failed: 1 });
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.5);
  });
});
