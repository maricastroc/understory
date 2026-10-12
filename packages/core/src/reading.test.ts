import { describe, expect, it } from "vitest";
import { factsOf, placementOf, qualityOf, readAnswer, specificityOf, stateOf } from "./reading";
import type { Artifact, CitationCheck, Evidence, VerifiedNarrative } from "./types";

const artifact = (
  id: string,
  kind: Artifact["kind"],
  date: string,
  over: Partial<Artifact> = {},
): Artifact => ({
  id,
  kind,
  title: `title of ${id}`,
  body: `body of ${id}`,
  url: "",
  date,
  ...over,
});

const first = artifact("commit:aaa1111", "commit", "2024-03-05T00:00:00Z", {
  meta: { sha: "aaa1111" },
});
const revert = artifact("commit:bbb2222", "commit", "2024-03-11T00:00:00Z", {
  meta: { sha: "bbb2222" },
});
const last = artifact("commit:ccc3333", "commit", "2024-03-18T00:00:00Z", {
  meta: { sha: "ccc3333" },
});
const pull = artifact("pr:7", "pull_request", "2024-03-17T00:00:00Z", { parentId: last.id });
const HUNK = ["@@ -1,2 +1,3 @@", " keep();", "+return row.quantity > 0;"].join("\n");
const review = (path: string, placed: { line?: number; outdated?: boolean } = {}) =>
  artifact("review:7-0", "review", "2024-03-17T00:00:00Z", {
    parentId: pull.id,
    body: "@someone: skip them only when discontinued\n@other: and say so in the log",
    comments: [
      {
        body: "skip them only when discontinued",
        path,
        diffHunk: HUNK,
        outdated: placed.outdated ?? true,
        line: placed.line ?? null,
      },
      {
        body: "and say so in the log",
        path: "src/log.ts",
        diffHunk: "@@ -1 +1 @@\n+log();",
        outdated: false,
        line: 9,
      },
    ],
  });

const evidence = (over: Partial<Evidence> = {}): Evidence => ({
  question: "Why?",
  repo: { path: "." },
  location: { file: "src/dedupe.ts", startLine: 4, endLine: 4 },
  artifacts: [first, revert, last],
  contradictions: [],
  coverage: { granularity: "line" },
  code: {
    startLine: 3,
    lines: ["export function keep(row) {", "  return row.quantity > 0;", "}"],
    change: {
      artifactId: last.id,
      before: "return true;",
      added: 1,
      scope: { files: 1, lines: 2, block: 2 },
    },
  },
  ...over,
});

type Told = {
  text: string;
  cites: string[];
  status: CitationCheck["status"] | null;
  quote?: string;
  quotes?: Record<string, string | null>;
};

const narrative = (claims: Told[]): VerifiedNarrative =>
  ({
    answer: "",
    answerable: true,
    recorded: true,
    citations: [],
    claims: claims.map((c) => ({ text: c.text, citations: c.cites, grounded: true })),
    entailment: {
      checked: true,
      supported: claims.filter((c) => c.status === "supported").length,
      misattributed: claims.filter((c) => c.status === "unsupported").length,
      checks: claims.flatMap((c, claim) =>
        c.status === null
          ? []
          : c.cites.map((citation) => ({
              citation,
              claim,
              status: c.status as CitationCheck["status"],
              quote: c.quotes ? (c.quotes[citation] ?? null) : (c.quote ?? null),
              reason: "",
            })),
      ),
    },
  }) as unknown as VerifiedNarrative;

const STORY: Told[] = [
  {
    text: "It first dropped every zero row to save writes.",
    cites: [first.id],
    status: "supported",
    quote: "saves one write",
  },
  {
    text: "It now drops them only when discontinued.",
    cites: [last.id],
    status: "supported",
    quote: "only for discontinued",
  },
  { text: "This was done because of a customer complaint.", cites: [last.id], status: "weak" },
  { text: "It has always been this way.", cites: [revert.id], status: "unsupported" },
  { text: "Nobody reviewed it.", cites: [], status: null },
];

describe("readAnswer — the sequence and what each change records", () => {
  it("gives nothing for a case with no line", () => {
    expect(readAnswer(evidence({ location: undefined }), narrative(STORY))).toBeNull();
  });

  it("keeps the changes in order and marks the last", () => {
    const reading = readAnswer(evidence(), narrative(STORY))!;
    expect(reading.changes.map((c) => c.id)).toEqual([first.id, revert.id, last.id]);
    expect(reading.changes.map((c) => c.last)).toEqual([false, false, true]);
    expect(reading.changes[2]).toMatchObject({ did: "rewrote", before: "return true;" });
  });

  it("never gives the reason of an earlier commit to the last one", () => {
    const reading = readAnswer(evidence(), narrative(STORY))!;
    const [early, , latest] = reading.changes;
    expect(early.reasons).toEqual([
      {
        claim: 0,
        scope: "earlier change",
        passages: [{ source: first.id, text: "saves one write" }],
      },
    ]);
    expect(latest.reasons.map((r) => r.claim)).toEqual([1]);
    const byId = new Map(evidence().artifacts.map((a) => [a.id, a]));
    for (const change of reading.changes)
      for (const reason of change.reasons)
        for (const passage of reason.passages) expect(byId.get(passage.source)?.id).toBe(change.id);
  });

  it("shows the writer's sentence only where the link to the line is specific", () => {
    const alone = readAnswer(evidence(), narrative(STORY))!;
    expect(alone.changes[2].reasons[0]).toMatchObject({ scope: "line", sentence: STORY[1].text });
    expect(alone.changes[0].reasons[0].sentence).toBeUndefined();
    const wide = evidence();
    wide.code!.change!.scope = { files: 9, lines: 157, block: 2 };
    const among = readAnswer(wide, narrative(STORY))!;
    expect(among.changes[2].reasons[0].scope).toBe("change");
    expect(among.changes[2].reasons[0].sentence).toBeUndefined();
  });

  it("keeps a review comment made in another file, with its scope and its place", () => {
    const ev = evidence({ artifacts: [first, revert, last, pull, review("src/other.ts")] });
    ev.code!.change!.scope = { files: 9, lines: 157, block: 2 };
    const told = [
      {
        text: "Because reviewers asked.",
        cites: ["review:7-0"],
        status: "supported" as const,
        quote: "skip them only when discontinued",
      },
    ];
    const reason = readAnswer(ev, narrative(told))!.changes[2].reasons[0];
    expect(reason.scope).toBe("change");
    expect(reason.sentence).toBeUndefined();
    expect(reason.passages).toEqual([
      {
        source: "review:7-0",
        text: "skip them only when discontinued",
        placement: "another file",
        outdated: true,
      },
    ]);
  });

  it("ties a reason to the line only when the comment was made on that line, and is current", () => {
    const told = [
      {
        text: "Because reviewers asked.",
        cites: ["review:7-0"],
        status: "supported" as const,
        quote: "skip them only when discontinued",
      },
    ];
    const wide = (placed: { line?: number; outdated?: boolean }) => {
      const ev = evidence({
        artifacts: [first, revert, last, pull, review("src/dedupe.ts", placed)],
      });
      ev.code!.change!.scope = { files: 9, lines: 157, block: 2 };
      return readAnswer(ev, narrative(told))!;
    };
    const on = wide({ line: 4, outdated: false });
    expect(on.changes[2].reasons[0]).toMatchObject({
      scope: "line",
      sentence: "Because reviewers asked.",
    });
    expect(on.changes[2].reasons[0].passages[0].placement).toBe("on the line");
    expect(on.claims[0].specificity).toBe("direct: a review comment on the line");
    for (const placed of [{}, { line: 4, outdated: true }, { line: 7, outdated: false }]) {
      const near = wide(placed);
      expect(near.changes[2].reasons[0].scope).toBe("change");
      expect(near.changes[2].reasons[0].sentence).toBeUndefined();
      expect(near.changes[2].reasons[0].passages[0].placement).toBe("in its hunk");
      expect(near.claims[0].state).toBe("recorded for the change, no specific link shown");
    }
  });

  it("leaves the place unknown when the passage is not one comment's own words", () => {
    const ev = evidence({
      artifacts: [first, revert, last, pull, review("src/dedupe.ts", { line: 4, outdated: false })],
    });
    ev.code!.change!.scope = { files: 9, lines: 157, block: 2 };
    const read = (quote: string) =>
      readAnswer(
        ev,
        narrative([
          { text: "Because reviewers asked.", cites: ["review:7-0"], status: "supported", quote },
        ]),
      )!;
    const summary = read("a sentence of the review's summary");
    expect(summary.changes[2].reasons[0].passages).toEqual([
      { source: "review:7-0", text: "a sentence of the review's summary" },
    ]);
    expect(summary.changes[2].reasons[0].scope).toBe("change");
    expect(summary.claims[0].specificity).toBe("the change that last changed the line");
    const both = review("src/dedupe.ts", { line: 4, outdated: false });
    both.comments!.push({ ...both.comments![0], path: "src/other.ts", line: 30 });
    const twice = readAnswer(
      { ...ev, artifacts: [first, revert, last, pull, both] },
      narrative([
        {
          text: "Because reviewers asked.",
          cites: ["review:7-0"],
          status: "supported",
          quote: "skip them only when discontinued",
        },
      ]),
    )!;
    expect(twice.changes[2].reasons[0].passages[0].placement).toBeUndefined();
    expect(twice.changes[2].reasons[0].scope).toBe("change");
  });

  it("keeps what no source sustains apart, by kind, and out of every change", () => {
    const reading = readAnswer(evidence(), narrative(STORY))!;
    expect(reading.unsustained).toEqual([
      { claim: 2, text: STORY[2].text, quality: "insufficient" },
      { claim: 3, text: STORY[3].text, quality: "refuted" },
      { claim: 4, text: STORY[4].text, quality: "absent" },
    ]);
    const shown = reading.changes.flatMap((c) => c.reasons.map((r) => r.claim));
    expect(shown).toEqual([0, 1]);
  });

  it("counts the verdicts exactly as the audit gave them", () => {
    const told = narrative(STORY);
    const reading = readAnswer(evidence(), told)!;
    expect(reading.claims).toHaveLength(told.claims.length);
    const stated = reading.claims.filter((c) => c.quality === "stated by a cited source").length;
    expect(stated).toBe(told.entailment?.supported);
    expect(reading.claims.filter((c) => c.quality === "refuted")).toHaveLength(1);
  });

  it("shows the changes and nothing else when the answer abstains or is missing", () => {
    for (const told of [null, narrative([])]) {
      const reading = readAnswer(evidence(), told)!;
      expect(reading.changes).toHaveLength(3);
      expect(reading.changes.every((c) => c.reasons.length === 0)).toBe(true);
      expect(reading.unsustained).toEqual([]);
    }
  });
});

describe("readAnswer — the direct link belongs to the source that carries it", () => {
  const issue = artifact("issue:3", "issue", "2024-03-01T00:00:00Z", { parentId: pull.id });
  const SAID = "skip them only when discontinued";
  const placed = (comment: { path: string; diffHunk?: string; line?: number }) =>
    artifact("review:7-0", "review", "2024-03-17T00:00:00Z", {
      parentId: pull.id,
      body: `@someone: ${SAID}`,
      comments: [
        {
          body: SAID,
          path: comment.path,
          diffHunk: comment.diffHunk ?? HUNK,
          outdated: false,
          line: comment.line ?? null,
        },
      ],
    });
  const alone = (...more: Artifact[]) => evidence({ artifacts: [first, revert, last, ...more] });
  const among = (...more: Artifact[]) => {
    const ev = alone(...more);
    ev.code!.change!.scope = { files: 9, lines: 157, block: 2 };
    return ev;
  };
  const one = (cites: string[], quotes: Record<string, string | null>): Told[] => [
    { text: "Because of this.", cites, status: "supported", quotes },
  ];
  const BORROWED = {
    specificity: "the change that last changed the line",
    state: "recorded for the change, no specific link shown",
  };

  it("keeps the commit's own message linked to the line when the commit is the block alone", () => {
    const reading = readAnswer(alone(pull), narrative(one([last.id], { [last.id]: "body" })))!;
    expect(reading.changes[2].reasons).toEqual([
      {
        claim: 0,
        scope: "line",
        sentence: "Because of this.",
        passages: [{ source: last.id, text: "body" }],
      },
    ]);
    expect(reading.claims[0]).toMatchObject({
      specificity: "direct: the change is this block alone",
      state: "directly linked to the line",
    });
  });

  it("does not lend that link to the pull request's description or to a linked issue", () => {
    for (const source of [pull, issue]) {
      const reading = readAnswer(
        alone(pull, issue),
        narrative(one([source.id], { [source.id]: "body" })),
      )!;
      expect(reading.changes[2].reasons).toEqual([
        { claim: 0, scope: "change", passages: [{ source: source.id, text: "body" }] },
      ]);
      expect(reading.claims[0]).toMatchObject(BORROWED);
      expect(reading.unsustained).toEqual([]);
    }
  });

  it("does not lend it to a review comment made near the line, elsewhere or in another file", () => {
    const places = [
      [{ path: "src/dedupe.ts", line: 7 }, "in its hunk"],
      [
        { path: "src/dedupe.ts", diffHunk: "@@ -9 +9 @@\n+other();", line: 9 },
        "same file, elsewhere",
      ],
      [{ path: "src/other.ts", line: 4 }, "another file"],
    ] as const;
    for (const [comment, placement] of places) {
      const reading = readAnswer(
        alone(pull, placed(comment)),
        narrative(one(["review:7-0"], { "review:7-0": SAID })),
      )!;
      expect(reading.changes[2].reasons).toEqual([
        {
          claim: 0,
          scope: "change",
          passages: [{ source: "review:7-0", text: SAID, placement, outdated: false }],
        },
      ]);
      expect(reading.claims[0]).toMatchObject(BORROWED);
    }
  });

  it("keeps a review comment made on the line linked to it, whatever the size of the commit", () => {
    for (const ev of [alone, among]) {
      const reading = readAnswer(
        ev(pull, placed({ path: "src/dedupe.ts", line: 4 })),
        narrative(one(["review:7-0"], { "review:7-0": SAID })),
      )!;
      expect(reading.changes[2].reasons[0]).toMatchObject({
        scope: "line",
        sentence: "Because of this.",
        passages: [{ source: "review:7-0", placement: "on the line" }],
      });
      expect(reading.claims[0]).toMatchObject({
        specificity: "direct: a review comment on the line",
        state: "directly linked to the line",
      });
    }
  });

  it("splits what one claim quotes by the link of each source", () => {
    const reading = readAnswer(
      alone(pull),
      narrative(one([last.id, pull.id], { [last.id]: "body of commit", [pull.id]: "body of pr" })),
    )!;
    expect(reading.changes[2].reasons).toEqual([
      {
        claim: 0,
        scope: "line",
        sentence: "Because of this.",
        passages: [{ source: last.id, text: "body of commit" }],
      },
      { claim: 0, scope: "change", passages: [{ source: pull.id, text: "body of pr" }] },
    ]);
    expect(reading.claims[0].state).toBe("directly linked to the line");
  });

  it("does not call a claim linked to the line when its commit is cited and only the pull request is quoted", () => {
    const reading = readAnswer(
      alone(pull),
      narrative(one([last.id, pull.id], { [last.id]: null, [pull.id]: "body of pr" })),
    )!;
    expect(reading.changes[2].reasons).toEqual([
      { claim: 0, scope: "change", passages: [{ source: pull.id, text: "body of pr" }] },
    ]);
    expect(reading.claims[0]).toMatchObject(BORROWED);
  });

  it("does not let a comment on the line lend its link to the description quoted beside it", () => {
    const reading = readAnswer(
      among(pull, placed({ path: "src/dedupe.ts", line: 4 })),
      narrative(one(["review:7-0", pull.id], { "review:7-0": SAID, [pull.id]: "body of pr" })),
    )!;
    expect(
      reading.changes[2].reasons.map((r) => [r.scope, r.passages.map((p) => p.source)]),
    ).toEqual([
      ["line", ["review:7-0"]],
      ["change", [pull.id]],
    ]);
    expect(reading.changes[2].reasons[1].sentence).toBeUndefined();
    expect(reading.claims[0].specificity).toBe("direct: a review comment on the line");
  });

  it("links nothing to the line through a change that is not the last", () => {
    const earlier = { ...pull, id: "pr:5", parentId: first.id };
    const old = artifact("review:5-0", "review", "2024-03-04T00:00:00Z", {
      parentId: earlier.id,
      body: `@someone: ${SAID}`,
      comments: [{ body: SAID, path: "src/dedupe.ts", diffHunk: HUNK, outdated: false, line: 4 }],
    });
    const reading = readAnswer(
      alone(earlier, old),
      narrative(one(["review:5-0"], { "review:5-0": SAID })),
    )!;
    expect(reading.changes[0].reasons[0].scope).toBe("earlier change");
    expect(reading.claims[0]).toMatchObject({
      specificity: "another change in the line's history",
      state: "recorded for the change, no specific link shown",
    });
  });

  it("grades a cited source the same way, before any passage is read", () => {
    const facts = factsOf(alone(pull, issue, placed({ path: "src/other.ts", line: 4 })));
    expect(specificityOf(facts, [last.id])).toBe("direct: the change is this block alone");
    for (const id of [pull.id, issue.id, "review:7-0"])
      expect(specificityOf(facts, [id])).toBe("the change that last changed the line");
    expect(specificityOf(facts, [pull.id, last.id])).toBe("direct: the change is this block alone");
  });
});

describe("readAnswer — evidence that says less", () => {
  it("never calls a reason tied to the line when the scope was not recorded", () => {
    const old = evidence();
    delete old.code!.change!.scope;
    const reading = readAnswer(old, narrative(STORY))!;
    expect(reading.changes[2].reasons[0].scope).toBe("change");
    expect(reading.earlier).toBe("not read");
    expect(reading.claims.some((c) => c.state === "directly linked to the line")).toBe(false);
  });

  it("gives the file's history its own scope, and does not call it the line's", () => {
    const reading = readAnswer(evidence({ coverage: { granularity: "file" } }), narrative(STORY))!;
    expect(reading.history).toBe("the file");
    expect(reading.changes[2].reasons[0].scope).toBe("file");
    expect(reading.claims[1].specificity).toBe("the file's history");
    expect(readAnswer(evidence(), narrative(STORY))!.history).toBe("the line");
  });

  it("lists a change found by walking back as a fact, with no reason of its own", () => {
    const ev = evidence({
      artifacts: [last],
      lineage: {
        stopped: "depth limit",
        entries: [
          {
            sha: "ccc3333ffff",
            date: last.date,
            title: "last",
            did: "rewrote",
            before: "return true;",
          },
          {
            sha: "0001111ffff",
            date: "2023-01-01T00:00:00Z",
            title: "scaffold",
            message: "whole message",
            did: "added",
            before: null,
          },
        ],
      },
    });
    const reading = readAnswer(ev, narrative([STORY[1]]))!;
    expect(reading.changes.map((c) => [c.id, c.shownToTheModels, c.reasons.length])).toEqual([
      ["commit:0001111", false, 0],
      [last.id, true, 1],
    ]);
    expect(reading.changes[0]).toMatchObject({ did: "added", message: "whole message" });
    expect(reading.earlier).toBe("depth limit");
  });

  it("says nothing is missing when the walk ended where the line was added", () => {
    const ev = evidence({ lineage: { stopped: "the line was added", entries: [] } });
    expect(readAnswer(ev, null)!.earlier).toBeNull();
  });
});

describe("the two readings of a claim, kept apart", () => {
  it("grades the evidence without looking at the link", () => {
    expect(qualityOf("supported")).toBe("stated by a cited source");
    expect(qualityOf("weak")).toBe("insufficient");
    expect(qualityOf("unsupported")).toBe("refuted");
    expect(qualityOf(null)).toBe("absent");
  });

  it("grades the link without looking at the evidence, and needs both for the strongest state", () => {
    const facts = factsOf(evidence());
    expect(specificityOf(facts, [last.id])).toBe("direct: the change is this block alone");
    expect(specificityOf(facts, [first.id])).toBe("another change in the line's history");
    expect(specificityOf(facts, ["commit:unknown"])).toBe("none");
    expect(stateOf("insufficient", "direct: the change is this block alone")).toBe("not sustained");
    expect(stateOf("stated by a cited source", "another change in the line's history")).toBe(
      "recorded for the change, no specific link shown",
    );
  });

  it("places a review comment on the line by its line number, never by its text alone", () => {
    const comment = { body: "", path: "a.ts", diffHunk: HUNK, outdated: false, line: 4 };
    expect(placementOf(comment, "a.ts", "return row.quantity > 0;", 4)).toBe("on the line");
    expect(placementOf(comment, "a.ts", "return row.quantity > 0;")).toBe("in its hunk");
    expect(placementOf(comment, "a.ts", "return row.quantity > 0;", 12)).toBe("in its hunk");
    expect(placementOf({ ...comment, outdated: true }, "a.ts", "return row.quantity > 0;", 4)).toBe(
      "in its hunk",
    );
    expect(placementOf(comment, "a.ts", "other();", 12)).toBe("same file, elsewhere");
    expect(placementOf(comment, "b.ts", "keep();", 4)).toBe("another file");
  });
});
