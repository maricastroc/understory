import { describe, expect, it } from "vitest";
import { buildSynthesisInput, toNarrative } from "./synthesize";
import type { Artifact, Evidence } from "./types";

const mk = (id: string, body: string): Artifact => ({
  id,
  kind: "commit",
  title: id,
  body,
  url: "",
  date: "2023-01-01",
});

const evidence = (artifacts: Artifact[]): Evidence => ({
  question: "Why is this line the way it is?",
  repo: { path: "o/r", name: "r" },
  location: { file: "a.ts", startLine: 1, endLine: 1 },
  artifacts,
  contradictions: [],
});

describe("buildSynthesisInput", () => {
  it("keeps every artifact id and bounds the prompt when evidence is large", () => {
    const many = Array.from({ length: 30 }, (_, i) => mk(`commit:${i}`, "x".repeat(5000)));
    const { prompt } = buildSynthesisInput(evidence(many));

    for (let i = 0; i < 30; i++) {
      expect(prompt).toContain(`[commit:${i}]`);
    }
    expect(prompt).toContain("[truncated]");
    expect(prompt.length).toBeLessThan(18_000);
  });

  it("leaves small evidence untouched", () => {
    const { prompt } = buildSynthesisInput(evidence([mk("commit:a", "bumped the retry ceiling")]));
    expect(prompt).toContain("bumped the retry ceiling");
    expect(prompt).not.toContain("[truncated]");
  });
});

describe("buildSynthesisInput — language", () => {
  const ev = evidence([mk("commit:a", "x")]);

  it("defaults to following the question's language", () => {
    expect(buildSynthesisInput(ev).system).toContain("same language as the Question");
  });

  it("forces Portuguese when asked", () => {
    const { system } = buildSynthesisInput(ev, "pt");
    expect(system).toContain("Brazilian Portuguese");
    expect(system).not.toContain("same language as the Question");
  });

  it("forces English when asked", () => {
    const { system } = buildSynthesisInput(ev, "en");
    expect(system).toContain("in English, no matter");
  });
});

describe("toNarrative", () => {
  const raw = (over: Partial<Parameters<typeof toNarrative>[0]> = {}) => ({
    answerable: true,
    recorded: true,
    answer: "",
    claims: [],
    ...over,
  });

  it("joins claim texts into `answer` and unions their citations", () => {
    const n = toNarrative(
      raw({
        claims: [
          { text: "Bounded the retries.", citations: ["commit:a"] },
          { text: "After a Stripe outage.", citations: ["issue:7", "commit:a"] },
        ],
      }),
    );
    expect(n.answer).toBe("Bounded the retries. After a Stripe outage.");
    expect(n.citations).toEqual(["commit:a", "issue:7"]);
    expect(n.claims).toHaveLength(2);
  });

  it("drops claims and keeps the one-line answer when not recorded", () => {
    const n = toNarrative(
      raw({
        recorded: false,
        answer: "The history does not explain it.",
        claims: [{ text: "should be ignored", citations: ["commit:a"] }],
      }),
    );
    expect(n.claims).toEqual([]);
    expect(n.answer).toBe("The history does not explain it.");
    expect(n.citations).toEqual([]);
  });

  it("drops claims when the question is out of scope", () => {
    const n = toNarrative(
      raw({ answerable: false, answer: "Outside this code's history.", claims: [] }),
    );
    expect(n.claims).toEqual([]);
    expect(n.answer).toBe("Outside this code's history.");
  });
});
