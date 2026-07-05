import { describe, expect, it } from "vitest";
import type { Artifact, Contradiction, Evidence, Narrative } from "./types";
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
  return { answer: "because reasons", citations: [], recorded: true, answerable: true, ...partial };
}

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

  it("a single primary source is medium (0.65)", () => {
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1"], recorded: true }));
    expect(v.confidence.level).toBe("medium");
    expect(v.confidence.score).toBe(0.65);
  });

  it("two or more primary sources is high (0.9)", () => {
    const v = verify(ev(["c1", "c2"]), narr({ citations: ["c1", "c2"], recorded: true }));
    expect(v.confidence.level).toBe("high");
    expect(v.confidence.score).toBe(0.9);
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
    const v = verify(ev(["c1", "c2"], [contra("c2")]), narr({ citations: ["c1"], recorded: true }));
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
