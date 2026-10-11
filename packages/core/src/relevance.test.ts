import { describe, expect, it } from "vitest";
import { buildRelevanceInput, checkRelevance, sweptAlong } from "./relevance";
import { scriptedJudge } from "./testing/scripted-judge";
import type { Artifact, Evidence } from "./types";
import { verify } from "./verify";

const commit = (id: string, title: string, body: string, date: string): Artifact => ({
  id,
  kind: "commit",
  title,
  body,
  url: "",
  date,
});

const evidence = (over: Partial<Evidence> = {}): Evidence => ({
  question: "Why is this line the way it is?",
  repo: { path: "o/r" },
  location: { file: "src/linter.ts", startLine: 257, endLine: 257 },
  code: {
    startLine: 256,
    lines: ["} else {", 'const oldSource = fs.readFileSync(filePath, "utf-8");', "}"],
  },
  artifacts: [
    commit("commit:aaa1111", "Add the linter", "First version.", "2016-01-01"),
    commit(
      "commit:63fc794",
      "Rewrite enable/disable logic (#2369)",
      "Move disabledIntervals out of rule options.",
      "2017-05-09",
    ),
  ],
  contradictions: [],
  ...over,
});

describe("buildRelevanceInput", () => {
  it("shows the code, the change blame points at and the evidence, in that order", () => {
    const { system, prompt } = buildRelevanceInput(evidence())!;
    const code = prompt.indexOf('> 257 | const oldSource = fs.readFileSync(filePath, "utf-8");');
    const blame = prompt.indexOf(
      'Blame: last changed by [commit:63fc794], "Rewrite enable/disable logic (#2369)".',
    );
    const record = prompt.indexOf("[commit:63fc794] commit · 2017-05-09");
    expect(code).toBeGreaterThan(-1);
    expect(blame).toBeGreaterThan(code);
    expect(record).toBeGreaterThan(blame);
    expect(prompt).toContain("Code location: src/linter.ts:257");
    expect(system).toContain("whether that\nhistory is ABOUT this code");
    expect(system).toContain("If in doubt, set belongs=true.");
  });

  it("follows the language asked for the line it may write", () => {
    expect(buildRelevanceInput(evidence(), "pt")!.system).toContain("Brazilian Portuguese");
    expect(buildRelevanceInput(evidence())!.system).toContain("same language as the Question");
  });

  it("has nothing to decide without the code, a location or any evidence", () => {
    expect(buildRelevanceInput(evidence({ code: undefined }))).toBeNull();
    expect(buildRelevanceInput(evidence({ location: undefined }))).toBeNull();
    expect(buildRelevanceInput(evidence({ artifacts: [] }))).toBeNull();
  });

  it("trims long bodies and keeps every artifact id", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      commit(`commit:${i}`, `c${i}`, "x".repeat(5000), "2020-01-01"),
    );
    const { prompt } = buildRelevanceInput(evidence({ artifacts: many }))!;
    for (let i = 0; i < 30; i++) expect(prompt).toContain(`[commit:${i}]`);
    expect(prompt).toContain("[truncated]");
    expect(prompt.length).toBeLessThan(12_000);
  });
});

describe("checkRelevance", () => {
  it("asks the model once and returns its decision", async () => {
    const seen: string[] = [];
    const model = scriptedJudge((prompt) => {
      seen.push(prompt);
      return { belongs: false, answer: "Last touched by #2369, which is about something else." };
    });
    const decision = await checkRelevance(evidence(), model);
    expect(decision).toEqual({
      belongs: false,
      answer: "Last touched by #2369, which is about something else.",
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("const oldSource = fs.readFileSync");
    expect(model.doGenerateCalls[0].maxOutputTokens).toBe(1_000);
  });

  it("does not call the model when there is no code to look at", async () => {
    const model = scriptedJudge(() => ({ belongs: false, answer: "x" }));
    expect(await checkRelevance(evidence({ code: undefined }), model)).toBeNull();
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});

describe("sweptAlong", () => {
  it("turns a line the change swept along into an abstention with no claim", () => {
    const narrative = sweptAlong({ belongs: false, answer: " Last touched by #2369. " });
    expect(narrative).toEqual({
      answerable: true,
      recorded: false,
      claims: [],
      answer: "Last touched by #2369.",
      citations: [],
    });
    const verified = verify(evidence(), narrative!);
    expect(verified.grounded).toBe(true);
    expect(verified.confidence).toMatchObject({ score: 0.3, level: "low" });
  });

  it("lets the answer be written when the code belongs, or when nothing was decided", () => {
    expect(sweptAlong({ belongs: true, answer: "" })).toBeNull();
    expect(sweptAlong(null)).toBeNull();
  });

  it("does not abstain on a decision that came without the line to show", () => {
    expect(sweptAlong({ belongs: false, answer: "   " })).toBeNull();
  });
});
