import { readFileSync } from "node:fs";
import type { EntailmentStatus, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import type { Judgement, WrittenClaim } from "./eval-audit-claims";
import type { CaseFacts } from "./eval-link-states";
import { project } from "./eval-present";
import {
  POLICIES,
  answerLines,
  answerRows,
  answerTables,
  claimPresentations,
  controlLines,
  controlRows,
  controlTables,
  givesSentence,
  groupOf,
  leadOf,
  presentationOf,
  saidElsewhere,
  verdictFor,
} from "./eval-presentation";
import { type RunRecord, parseRecords } from "./eval-report";

const [DIRECT, INFERENCE, EARLIER] = POLICIES;

const facts = (over: Partial<CaseFacts> = {}): CaseFacts => ({
  id: "a",
  granularity: "line",
  alone: false,
  sources: {
    "commit:last": { kind: "commit", link: "this change", comments: [] },
    "pr:7": { kind: "pull_request", link: "this change", comments: [] },
    "commit:first": { kind: "commit", link: "another change", comments: [] },
    "issue:9": { kind: "issue", link: "unlinked", comments: [] },
    "review:7-0": {
      kind: "review",
      link: "this change",
      comments: [{ placement: "another file", outdated: true }],
    },
    "review:7-1": {
      kind: "review",
      link: "this change",
      comments: [{ placement: "same file, elsewhere", outdated: true }],
    },
    "review:7-2": { kind: "review", link: "this change", comments: [] },
  },
  ...over,
});

type Written = { text: string; citations: string[]; status?: EntailmentStatus; quoted?: string[] };

const narrative = (claims: Written[], over: Partial<VerifiedNarrative> = {}): VerifiedNarrative =>
  ({
    answerable: true,
    recorded: claims.length > 0,
    answer: "",
    citations: [],
    claims: claims.map((c) => ({ text: c.text, citations: c.citations, grounded: true })),
    entailment: {
      checked: true,
      supported: 0,
      misattributed: 0,
      checks: claims.flatMap((c, claim) =>
        c.status
          ? c.citations.map((citation) => ({
              citation,
              claim,
              status: c.status as EntailmentStatus,
              quote: (c.quoted ?? c.citations).includes(citation) ? "the passage" : null,
              reason: "",
            }))
          : [],
      ),
    },
    ...over,
  }) as VerifiedNarrative;

const run = (
  id: string,
  pass: number,
  told: VerifiedNarrative | null,
  over: Partial<RunRecord> = {},
): RunRecord => ({
  type: "run",
  id,
  set: "v2",
  category: "recorded",
  source: "sampled",
  pass,
  ms: 10,
  outcome: { kind: "pass", answerable: true },
  artifacts: [],
  narrative: told,
  ...over,
});

const control = (id: string, kind: string, expect: WrittenClaim["expect"]): WrittenClaim => ({
  id,
  kind,
  expect,
  text: `${id}: ${kind}`,
  citations: ["pr:7"],
});

const judged = (c: WrittenClaim, statuses: EntailmentStatus[]): Judgement[] =>
  statuses.map((status, replay) => ({
    type: "judgement",
    id: c.id,
    claim: c.text,
    citations: c.citations,
    replay,
    control: false,
    raw: null,
    status,
    quote: null,
    fellBack: false,
    kind: c.kind,
    expect: c.expect,
  }));

describe("what a claim would be presented as", () => {
  it("is documented for the line only through a source that carries the link", () => {
    expect(presentationOf(facts({ alone: true }), "supported", ["commit:last"])).toBe(
      "documented for the line",
    );
    expect(presentationOf(facts({ alone: true }), "supported", ["pr:7"])).toBe(
      "inferred from the last change",
    );
  });

  it("is an inference when the last change's own record states the reason", () => {
    expect(presentationOf(facts(), "supported", ["commit:last"])).toBe(
      "inferred from the last change",
    );
    expect(presentationOf(facts(), "supported", ["pr:7"])).toBe("inferred from the last change");
  });

  it("is never an inference about the last change when the source belongs to an earlier one", () => {
    expect(presentationOf(facts(), "supported", ["commit:first"])).toBe(
      "told of an earlier change",
    );
  });

  it("keeps out of the inference a review comment made in another file", () => {
    expect(saidElsewhere(facts(), ["review:7-0"])).toBe(true);
    expect(presentationOf(facts(), "supported", ["review:7-0"])).toBe(
      "said elsewhere in the change",
    );
  });

  it("does not hold against a claim a comment whose place settles nothing", () => {
    expect(presentationOf(facts(), "supported", ["review:7-1"])).toBe(
      "inferred from the last change",
    );
    expect(presentationOf(facts(), "supported", ["review:7-2"])).toBe(
      "inferred from the last change",
    );
    expect(presentationOf(facts(), "supported", ["review:7-0", "pr:7"])).toBe(
      "inferred from the last change",
    );
  });

  it("names the file's history and a source with no link as what they are", () => {
    expect(presentationOf(facts({ granularity: "file" }), "supported", ["commit:last"])).toBe(
      "from the file's history",
    );
    expect(presentationOf(facts(), "supported", ["issue:9"])).toBe(
      "stated, with no link to the line",
    );
    expect(presentationOf(undefined, "supported", ["commit:last"])).toBe(
      "stated, with no link to the line",
    );
  });

  it("presents nothing the audit did not credit, whatever the link", () => {
    for (const status of ["weak", "unsupported", null] as const)
      expect(presentationOf(facts({ alone: true }), status, ["commit:last"])).toBe(
        "not established",
      );
  });
});

describe("the three rules for showing a sentence", () => {
  it("differ only on inferences and on earlier changes", () => {
    expect(POLICIES.map((p) => givesSentence(p, "documented for the line"))).toEqual([
      true,
      true,
      true,
    ]);
    expect(POLICIES.map((p) => givesSentence(p, "inferred from the last change"))).toEqual([
      false,
      true,
      true,
    ]);
    expect(POLICIES.map((p) => givesSentence(p, "told of an earlier change"))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("never show the sentence of a claim kept as context, unestablished or not made", () => {
    for (const as of [
      "said elsewhere in the change",
      "from the file's history",
      "stated, with no link to the line",
      "not established",
      "abstained",
      "out of scope",
      "no answer",
    ] as const)
      expect(POLICIES.some((p) => givesSentence(p, as))).toBe(false);
  });
});

describe("the claims of a kept run", () => {
  it("follow the source the verified passage is in, not every source cited", () => {
    const told = narrative([
      {
        text: "t",
        citations: ["commit:last", "pr:7"],
        status: "supported",
        quoted: ["pr:7"],
      },
      { text: "u", citations: ["commit:last", "pr:7"], status: "supported" },
    ]);
    expect(claimPresentations(run("a", 0, told), facts({ alone: true }))).toEqual([
      "inferred from the last change",
      "documented for the line",
    ]);
  });

  it("call a claim the audit never judged not established", () => {
    const told = narrative([{ text: "t", citations: ["commit:last"] }]);
    expect(claimPresentations(run("a", 0, told), facts({ alone: true }))).toEqual([
      "not established",
    ]);
  });
});

describe("what leads an answer", () => {
  it("is its best sustained claim", () => {
    const told = narrative([
      { text: "t", citations: ["commit:first"], status: "supported" },
      { text: "u", citations: ["pr:7"], status: "supported" },
      { text: "v", citations: ["pr:7"], status: "weak" },
    ]);
    const record = run("a", 0, told);
    expect(leadOf(record, claimPresentations(record, facts()))).toBe(
      "inferred from the last change",
    );
  });

  it("tells an abstention, a refusal and a failed run apart", () => {
    expect(leadOf(run("a", 0, narrative([])), [])).toBe("abstained");
    expect(leadOf(run("a", 0, narrative([], { answerable: false })), [])).toBe("out of scope");
    expect(leadOf(run("a", 0, null), [])).toBe("no answer");
  });
});

describe("the kept verdict of a run", () => {
  const held = run("fp", 1, narrative([]), { outcome: { kind: "review", answerable: true } });

  it("is the manual one for a held run, and pending without it", () => {
    expect(verdictFor("f.jsonl", held)).toBe("pending");
    expect(
      verdictFor("f.jsonl", held, { adjudication: { "fp#1": { verdict: "fail", note: "" } } }),
    ).toBe("fail");
  });

  it("takes a re-read only for the case it was made for", () => {
    const reread = { case: "ng", runs: { "f.jsonl#1": { now: "fail" as const } } };
    expect(verdictFor("f.jsonl", run("ng", 1, null), { reread })).toBe("fail");
    expect(verdictFor("f.jsonl", run("other", 1, null), { reread })).toBe("pass");
    expect(verdictFor("g.jsonl", run("ng", 1, null), { reread })).toBe("pass");
  });
});

describe("the controls, read against what each is", () => {
  const TRUE = control("a", "true of the code and backed by a source", "supported");
  const BORROWED = control(
    "a",
    "gives the line a reason the source gives for another part of the change",
    "not-supported",
  );
  const INVENTED = control("a", "gives a reason no source gives", "not-supported");
  const rows = controlRows(
    [TRUE, BORROWED, INVENTED],
    [
      ...judged(TRUE, ["supported", "weak"]),
      ...judged(BORROWED, ["supported", "weak"]),
      ...judged(INVENTED, ["weak", "unsupported"]),
    ],
    new Map([["a", facts()]]),
  );
  const tables = controlTables(rows);

  it("groups a control by what it should get and by whose reason it gives", () => {
    expect([TRUE, BORROWED, INVENTED].map(groupOf)).toEqual(["true", "borrowed", "false"]);
    expect(
      groupOf(
        control(
          "a",
          "gives the last change the reason of another change in the line's history",
          "not-supported",
        ),
      ),
    ).toBe("borrowed");
  });

  it("keeps a true claim shown as an inference apart from a borrowed one", () => {
    expect(tables.presented.true["inferred from the last change"]).toBe(1);
    expect(tables.presented.borrowed["inferred from the last change"]).toBe(1);
    expect(tables.borrowedAsAnInference).toEqual({ a: 1 });
    expect(tables.trueNotPresented).toEqual({ a: 1 });
    expect(tables.sentence[DIRECT]).toEqual({});
    expect(tables.sentence[INFERENCE]).toEqual({ true: 1, borrowed: 1 });
    expect(tables.sentence[EARLIER]).toEqual({ true: 1, borrowed: 1 });
  });

  it("counts the controls presented one way on every judgement", () => {
    expect(tables.steady).toEqual({ same: 1, of: 3 });
  });

  it("says each reading in a line of its own", () => {
    const lines = controlLines(tables);
    expect(lines).toContain(
      "  grave, a borrowed or false claim presented as documented for the line: 0",
    );
    expect(lines).toContain(
      "  incorrect attribution, a borrowed reason presented as an inference: 1 of 2 (1 a)",
    );
    expect(lines).toContain(
      "  legitimate uncertainty, a true claim presented as an inference: 1 of 2",
    );
    expect(lines).toContain("  true: 0 · 1 · 1 of 2");
  });
});

describe("the answers, read against their kept verdicts", () => {
  const good = narrative([{ text: "t", citations: ["pr:7"], status: "supported" }]);
  const rows = answerRows(
    "f.jsonl",
    [
      run("a", 0, good),
      run("a", 1, narrative([])),
      run("b", 0, good, {
        category: "incidental",
        outcome: { kind: "review", answerable: true },
      }),
      run("b", 1, null, { category: "incidental", outcome: { kind: "error", message: "x" } }),
    ],
    new Map([
      ["a", facts()],
      ["b", { ...facts(), id: "b" }],
    ]),
    {
      adjudication: { "b#0": { verdict: "fail", note: "borrowed" } },
      flagged: new Set(["b#0"]),
    },
  );
  const tables = answerTables(rows);

  it("counts the accepted answers that would reach the reader as a sentence", () => {
    expect(tables.accepted).toEqual({ "recorded, real lines": 2 });
    expect(tables.acceptedWithASentence[DIRECT]).toEqual({});
    expect(tables.acceptedWithASentence[INFERENCE]).toEqual({ "recorded, real lines": 1 });
  });

  it("shows a failed or flagged run under what would lead it", () => {
    expect(tables.failed).toEqual({
      "incidental, real lines": { "inferred from the last change": 1 },
    });
    expect(tables.flagged).toEqual(tables.failed);
  });

  it("leaves a run with no answer out of the count of steady cases", () => {
    expect(tables.steady).toEqual({
      "recorded, real lines": { same: 0, of: 1 },
      "incidental, real lines": { same: 1, of: 1 },
    });
  });

  it("prints a row of the three rules for each category", () => {
    expect(answerLines("A run", tables)).toContain("  recorded, real lines: 0 · 1 · 1 of 2");
  });
});

describe("the kept presentation, recomputed from the kept files", () => {
  const kept = JSON.parse(readFileSync("eval/results/2026-10-12-presentation.json", "utf8"));
  const again = JSON.parse(JSON.stringify(project(kept.facts, kept.replay)));

  it("gives the same rows and the same tables", () => {
    expect(again.files).toEqual(kept.files);
    expect(again.controls).toEqual(kept.controls);
    expect(again.answers).toEqual(kept.answers);
    expect(again.tables).toEqual(kept.tables);
    expect(kept.controls.length).toBe(212);
    expect(kept.answers.length).toBeGreaterThan(800);
  });

  it("presents no borrowed or false control as documented, and no false one as an inference", () => {
    const { presented } = kept.tables.controls;
    expect(presented.borrowed["documented for the line"]).toBeUndefined();
    expect(presented.false).toEqual({ "not established": 88 });
  });

  it("agrees with the kept link projection on the state of every kept claim", () => {
    const links = JSON.parse(readFileSync("eval/results/2026-10-12-link-projection.json", "utf8"));
    const all = JSON.parse(readFileSync(links.facts, "utf8")).cases as CaseFacts[];
    const byCase = new Map(all.map((c) => [c.id, c]));
    const states = new Map<string, string>(
      links.claims.map((p: Record<string, unknown>) => [
        `${p.from}|${p.id}|${p.pass}|${p.claim}`,
        p.state,
      ]),
    );
    const stateOf = (as: string) =>
      as === "documented for the line"
        ? "directly linked to the line"
        : as === "not established" || as === "stated, with no link to the line"
          ? "not sustained"
          : "recorded for the change, no specific link shown";
    let seen = 0;
    for (const name of links.files as string[])
      for (const record of parseRecords(readFileSync(`eval/results/${name}`, "utf8")).runs)
        claimPresentations(record, byCase.get(record.id)).forEach((as, at) => {
          expect(stateOf(as)).toBe(states.get(`${name}|${record.id}|${record.pass}|${at}`));
          seen++;
        });
    expect(seen).toBe(links.claims.length);
  });
});
