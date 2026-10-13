import { readFileSync } from "node:fs";
import {
  commitArtifact,
  issueArtifact,
  prArtifact,
  reviewArtifact,
} from "@understory/core/collect/github/artifacts";
import { type Comment, foldComments } from "@understory/core/collect/github/comments";
import type { Artifact, Evidence, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import {
  type KeptOrigins,
  type PassageOrigin,
  changesOf,
  commentHolding,
  originIndex,
  partsOf,
  passageKey,
  passageOrigin,
  segmentsOf,
  sitsIn,
} from "./eval-passage-origin";

const said = (login: string, body: string): Comment => ({
  author: { login },
  body,
  createdAt: "2016-01-10T00:00:00Z",
});

const commit = (sha: string, date: string, message: string): Artifact =>
  commitArtifact({
    oid: sha.padEnd(40, "0"),
    abbreviatedOid: sha,
    messageHeadline: message.split("\n")[0],
    message,
    url: "",
    committedDate: date,
    author: null,
  });

const pull = (number: number, title: string, body: string, thread: Comment[], parent: string) => {
  const artifact = prArtifact({ number, title, body, url: "", createdAt: "2016-01-01T00:00:00Z" });
  return { ...artifact, body: foldComments(artifact.body, thread), parentId: parent };
};

const evidence = (file: string, line: string, artifacts: Artifact[], before: string | null) =>
  ({
    question: "Why is this line the way it is?",
    repo: { path: "o/r", name: "o/r" },
    location: { file, startLine: 4, endLine: 4 },
    coverage: { granularity: "line" },
    code: {
      startLine: 4,
      lines: [line],
      change: { artifactId: artifacts[artifacts.length - 1].id, before, added: 1 },
    },
    artifacts,
    contradictions: [],
  }) as unknown as Evidence;

type KeptCase = { evidence: Evidence; narrative: VerifiedNarrative };

const fixture = JSON.parse(
  readFileSync("src/components/line-investigation/fixtures/kept-cases.json", "utf8"),
) as { cases: Record<string, KeptCase> };

const where = (source: Artifact, quote: string) => sitsIn(source.kind, partsOf(source, quote));

describe("the parts of a collected record", () => {
  it("are a commit's title and the rest of its message", () => {
    const c = commit(
      "78ff826",
      "2024-02-13T15:40:00-03:00",
      "sync: halve the page size\n\n250 keeps a margin under that.",
    );
    expect(segmentsOf(c).map((s) => s.part)).toEqual(["title", "message"]);
    expect(where(c, "sync: halve the page size")).toBe("commit title");
    expect(where(c, "250 keeps a margin under that.")).toBe("commit message");
  });

  it("are a pull request's title, its description and the thread the collector folds in", () => {
    const pr = pull(
      7,
      "Add a cache",
      "It keeps the last page.",
      [said("ana", "Why a cache?")],
      "c",
    );
    expect(segmentsOf(pr).map((s) => s.part)).toEqual(["title", "description", "discussion"]);
    expect(where(pr, "Add a cache")).toBe("pull request title");
    expect(where(pr, "It keeps the last page.")).toBe("pull request description");
    expect(where(pr, "Why a cache?")).toBe("pull request discussion");
  });

  it("are the same three for an issue", () => {
    const issue = issueArtifact({
      number: 9,
      title: "Slow on large pages",
      body: "It takes a minute.",
      url: "",
      createdAt: "2016-01-01T00:00:00Z",
    });
    const folded = { ...issue, body: foldComments(issue.body, [said("ana", "Same here.")]) };
    expect(where(folded, "Slow on large pages")).toBe("issue title");
    expect(where(folded, "It takes a minute.")).toBe("issue description");
    expect(where(folded, "Same here.")).toBe("issue discussion");
  });

  it("are a review's summary and its comments", () => {
    const review = reviewArtifact(
      7,
      "",
      {
        author: { login: "ana" },
        state: "COMMENTED",
        body: "",
        submittedAt: "2016-01-02T00:00:00Z",
      },
      0,
    );
    const inline = [said("ana", "This check is redundant.")];
    expect(where({ ...review, body: foldComments("", inline) }, "This check is redundant.")).toBe(
      "review comment",
    );
    expect(where({ ...review, body: "Looks good overall." }, "Looks good overall.")).toBe(
      "review summary",
    );
    const both = { ...review, body: foldComments("Looks good overall.", inline) };
    expect(where(both, "Looks good overall.")).toBe("review summary");
    expect(where(both, "This check is redundant.")).toBe("review comment");
  });

  it("names every part a passage runs across, and none for a passage that is not there", () => {
    const c = commit("a", "2024-01-01T00:00:00Z", "Add a cache\n\nIt keeps the last page.");
    expect(where(c, "Add a cache It keeps the last page.")).toBe("commit title + commit message");
    expect(partsOf(c, "It drops the last page.")).toEqual([]);
    expect(where(c, "It drops the last page.")).toBe("not located");
  });

  it("leaves out a part that is empty", () => {
    const bare = pull(7, "Add a cache", "", [said("ana", "Why a cache?")], "c");
    expect(segmentsOf(bare).map((s) => s.part)).toEqual(["title", "discussion"]);
    expect(where(bare, "Why a cache?")).toBe("pull request discussion");
  });
});

describe("machine-32, a reason taken from the discussion of the pull request", () => {
  const last = commit("aa54a5f", "2016-01-15T01:27:41Z", "Add additional tests for SSH");
  const pr = pull(
    2493,
    "Additional SSH tests",
    "A few additional tests on top of those for the `docker-machine ssh` command.",
    [
      said(
        "nathanleclaire",
        "It does break the marshaling of a host.  Might have to use a different approach.",
      ),
      said(
        "nathanleclaire",
        "Rebased and revised it for feedback.  It no longer breaks marshal / unmarshal of hosts and the errors have been re-named.  PTAL",
      ),
    ],
    last.id,
  );
  const ev = evidence(
    "libmachine/host/host.go",
    "type StandardSSHClientCreator struct {",
    [pr, last],
    null,
  );
  const changes = changesOf(ev);
  const dropped = "It does break the marshaling of a host.";
  const revised = "It no longer breaks marshal / unmarshal of hosts";

  it("sits in the discussion, and the description is another part", () => {
    expect(where(pr, dropped)).toBe("pull request discussion");
    expect(where(pr, "@nathanleclaire: It does break the marshaling of a host.")).toBe(
      "pull request discussion",
    );
    expect(where(pr, "A few additional tests on top of those")).toBe("pull request description");
  });

  it("belongs to the change that last changed the line, which added it", () => {
    expect(changes).toEqual([
      expect.objectContaining({ id: "commit:aa54a5f", last: true, did: "added", before: null }),
    ]);
    expect(passageOrigin("machine-32", ev, pr, dropped, changes)).toMatchObject({
      parts: ["discussion"],
      change: "commit:aa54a5f",
      last: true,
    });
  });

  it("is told apart by nothing from the comment that says the approach was revised", () => {
    const { quote: a, ...first } = passageOrigin("machine-32", ev, pr, dropped, changes);
    const { quote: b, ...second } = passageOrigin("machine-32", ev, pr, revised, changes);
    expect(a).not.toBe(b);
    expect(first).toEqual(second);
  });
});

describe("tslint-189, a reason taken from one item of a description that lists several", () => {
  const last = commit(
    "8b853b2",
    "2018-01-09T22:50:57Z",
    "Cleanup and refactoring of (rule|formatter)Loader (#3412)",
  );
  const pr = pull(
    3412,
    "Cleanup and refactoring of (rule|formatter)Loader",
    [
      "#### Overview of change:",
      "* deprecate `getRelativePath`, use `path.resolve` instead",
      "* formatterLoader",
      "  * allow uncompiled custom formatters (we already allow uncompiled rules)",
      "  * try resolve formatter module relative to current directory first",
    ].join("\n"),
    [],
    last.id,
  );
  const ev = evidence(
    "src/linter.ts",
    "if (Formatter === undefined) {",
    [pr, last],
    "if (Formatter !== undefined) {",
  );
  const changes = changesOf(ev);
  const borrowed = "* allow uncompiled custom formatters (we already allow uncompiled rules)";
  const inTheHunk = "* deprecate `getRelativePath`, use `path.resolve` instead";

  it("sits in the description of the last change, which rewrote the line", () => {
    expect(changes).toEqual([
      expect.objectContaining({
        last: true,
        did: "rewrote",
        before: "if (Formatter !== undefined) {",
      }),
    ]);
    expect(passageOrigin("tslint-189", ev, pr, borrowed, changes)).toMatchObject({
      parts: ["description"],
      change: "commit:8b853b2",
      last: true,
    });
    expect(where(pr, "Cleanup and refactoring of (rule|formatter)Loader")).toBe(
      "pull request title",
    );
  });

  it("has the origin of the item the line's own hunk carries out: provenance is not pertinence", () => {
    const { quote: a, ...other } = passageOrigin("tslint-189", ev, pr, borrowed, changes);
    const { quote: b, ...own } = passageOrigin("tslint-189", ev, pr, inTheHunk, changes);
    expect(a).not.toBe(b);
    expect(other).toEqual(own);
  });
});

describe("tslint-257, the collected case", () => {
  const { evidence: ev } = fixture.cases["tslint-257"];
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const changes = changesOf(ev);
  const review = byId.get("review:2369-3") as Artifact;
  const pr = byId.get("pr:2369") as Artifact;
  const comment = "this check was added to do less work for disabled rules";

  it("places a review comment, with or without the prefix the collector gives it", () => {
    for (const quote of [comment, `@ajafff: technically you are right, but ${comment}`])
      expect(passageOrigin("tslint-257", ev, review, quote, changes)).toMatchObject({
        parts: ["review comment"],
        placement: "another file",
        outdated: true,
        change: "commit:63fc794",
        last: true,
      });
    expect(commentHolding(review, "a comment nobody made")).toBeNull();
  });

  it("tells the description of the pull request from its discussion", () => {
    expect(where(pr, "Rules are not responsible for disabling theirselves.")).toBe(
      "pull request description",
    );
    expect(where(pr, "Rewrite enable/disable logic")).toBe("pull request title");
    expect(where(pr, "@ajafff: To summarize both inline discussions:")).toBe(
      "pull request discussion",
    );
  });

  it("gives a borrowed reason the origin a reason of the change has", () => {
    const origin = passageOrigin(
      "tslint-257",
      ev,
      pr,
      "Rules are not responsible for disabling theirselves.",
      changes,
    );
    expect(origin).toMatchObject({ parts: ["description"], change: "commit:63fc794", last: true });
    expect(origin.placement).toBeUndefined();
  });
});

describe("ws-batch-size, a reason that belongs to an earlier change", () => {
  const added = commit(
    "83eb2b9",
    "2024-01-08T11:02:00-03:00",
    "sync: poll the warehouse API for inventory changes",
  );
  const halved = commit(
    "78ff826",
    "2024-02-13T15:40:00-03:00",
    "sync: halve the page size\n\nWH-2291: since the vendor's 11 Feb release, any page over roughly 300\nrows comes back as 413 Payload Too Large. 250 keeps a margin under that.",
  );
  const renamed = commit(
    "e4dfae7",
    "2024-04-09T08:55:00-03:00",
    "refactor: rename PAGE_SIZE to BATCH_SIZE",
  );
  const ev = evidence(
    "src/sync/poll.ts",
    "const BATCH_SIZE = 250;",
    [added, halved, renamed],
    "const PAGE_SIZE = 250;",
  );
  const sha = (a: Artifact) => String(a.meta?.sha);
  const changes = changesOf(ev, {
    stopped: "the line was added",
    entries: [
      {
        sha: sha(renamed),
        date: renamed.date,
        title: renamed.title,
        did: "rewrote",
        before: "const PAGE_SIZE = 250;",
      },
      {
        sha: sha(halved),
        date: halved.date,
        title: halved.title,
        did: "rewrote",
        before: "const PAGE_SIZE = 500;",
      },
      { sha: sha(added), date: added.date, title: added.title, did: "added", before: null },
    ],
  });
  const reason = "any page over roughly 300 rows comes back as 413 Payload Too Large.";

  it("keeps the changes to the line in order, each with what it did", () => {
    expect(changes.map(({ id, last, did, before }) => ({ id, last, did, before }))).toEqual([
      { id: "commit:83eb2b9", last: false, did: "added", before: null },
      { id: "commit:78ff826", last: false, did: "rewrote", before: "const PAGE_SIZE = 500;" },
      { id: "commit:e4dfae7", last: true, did: "rewrote", before: "const PAGE_SIZE = 250;" },
    ]);
  });

  it("ties the reason to the change that halved the size, not to the rename", () => {
    expect(passageOrigin("ws-batch-size", ev, halved, reason, changes)).toMatchObject({
      parts: ["message"],
      change: "commit:78ff826",
      last: false,
    });
    expect(
      passageOrigin(
        "ws-batch-size",
        ev,
        renamed,
        "refactor: rename PAGE_SIZE to BATCH_SIZE",
        changes,
      ),
    ).toMatchObject({ parts: ["title"], change: "commit:e4dfae7", last: true });
    expect(partsOf(renamed, reason)).toEqual([]);
  });
});

describe("ws-revert-story, the collected case", () => {
  const { evidence: ev, narrative } = fixture.cases["ws-revert-story"];
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const changes = changesOf(ev);
  const passages = (narrative.entailment?.checks ?? []).map((check) =>
    passageOrigin(
      "ws-revert-story",
      ev,
      byId.get(check.citation) as Artifact,
      check.quote as string,
      changes,
    ),
  );

  it("keeps the four changes in order, the last one last", () => {
    expect(changes.map(({ id, last, did }) => ({ id, last, did }))).toEqual([
      { id: "commit:90021c7", last: false, did: "added" },
      { id: "commit:22e1399", last: false, did: "rewrote" },
      { id: "commit:05a16a3", last: false, did: "rewrote" },
      { id: "commit:9da72fa", last: true, did: "rewrote" },
    ]);
  });

  it("ties each verified passage to its own change, earlier or last", () => {
    expect(
      passages.map(({ source, parts, change, last }) => ({ source, parts, change, last })),
    ).toEqual([
      { source: "commit:22e1399", parts: ["message"], change: "commit:22e1399", last: false },
      { source: "commit:05a16a3", parts: ["message"], change: "commit:05a16a3", last: false },
      { source: "commit:9da72fa", parts: ["title"], change: "commit:9da72fa", last: true },
    ]);
  });

  it("finds the title of the first drop in the revert's title too, each under its own change", () => {
    const title = "sync: drop rows with a zero quantity";
    const found = ["commit:22e1399", "commit:05a16a3"].map((id) =>
      passageOrigin("ws-revert-story", ev, byId.get(id) as Artifact, title, changes),
    );
    expect(found.map((p) => [p.change, p.parts, p.last])).toEqual([
      ["commit:22e1399", ["title"], false],
      ["commit:05a16a3", ["title"], false],
    ]);
  });
});

describe("the kept origins of the verified passages", () => {
  const kept = JSON.parse(
    readFileSync("eval/results/2026-10-13-passage-origins.json", "utf8"),
  ) as KeptOrigins & { what: string };
  const of = (id: string, is: (p: PassageOrigin) => boolean = () => true) =>
    kept.passages.filter((p) => p.id === id && is(p));

  it("say that provenance is not the reason for the line", () => {
    expect(kept.what).toContain("This is provenance only.");
    expect(kept.what).toContain("It does not say that the sentence is the reason");
  });

  it("locate every passage, in a change the case knows", () => {
    expect(kept.passages.length).toBeGreaterThan(150);
    for (const p of kept.passages) {
      const changes = kept.cases.find((c) => c.id === p.id)?.changes ?? [];
      expect(p.parts.length).toBeGreaterThan(0);
      expect(changes.map((c) => c.id)).toContain(p.change);
      expect(changes.find((c) => c.id === p.change)?.last).toBe(p.last);
    }
    expect(originIndex(kept).size).toBe(kept.passages.length);
    const [first] = kept.passages;
    expect(originIndex(kept).get(passageKey(first.id, first.source, first.quote))).toEqual(first);
  });

  it("hold the reasons borrowed for machine-32 in the discussion, never in the description", () => {
    const quoted = of("machine-32", (p) => p.source === "pr:2493");
    expect(quoted.length).toBeGreaterThan(0);
    for (const p of quoted) expect(p).toMatchObject({ parts: ["discussion"], last: true });
  });

  it("hold the reasons borrowed for tslint-189 and tslint-257 in the description", () => {
    const item = (id: string, text: string) => of(id, (p) => p.quote.includes(text));
    for (const p of [
      ...item("tslint-189", "allow uncompiled custom formatters"),
      ...item("tslint-189", "try resolve formatter module"),
      ...item("tslint-257", "Rules are not responsible for disabling"),
    ])
      expect(p).toMatchObject({ parts: ["description"], last: true });
    expect(item("tslint-189", "allow uncompiled custom formatters").length).toBeGreaterThan(0);
    expect(item("tslint-257", "Rules are not responsible for disabling").length).toBeGreaterThan(0);
  });

  it("place every review comment quoted for tslint-257 in another file", () => {
    const comments = of("tslint-257", (p) => p.kind === "review");
    expect(comments.length).toBeGreaterThan(0);
    for (const p of comments)
      expect(p).toMatchObject({ parts: ["review comment"], placement: "another file" });
  });

  it("tie the reason for 250 to the change that halved the size", () => {
    const changes = kept.cases.find((c) => c.id === "ws-batch-size")?.changes ?? [];
    expect(changes.map(({ id, last, did, before }) => ({ id, last, did, before }))).toEqual([
      { id: "commit:83eb2b9", last: false, did: "added", before: null },
      { id: "commit:78ff826", last: false, did: "rewrote", before: "const PAGE_SIZE = 500;" },
      { id: "commit:e4dfae7", last: true, did: "rewrote", before: "const PAGE_SIZE = 250;" },
    ]);
    const reason = of("ws-batch-size", (p) => p.quote.includes("413 Payload Too Large"));
    expect(reason.length).toBeGreaterThan(0);
    for (const p of reason) expect(p).toMatchObject({ change: "commit:78ff826", last: false });
    for (const p of of("ws-batch-size", (q) => q.source === "commit:e4dfae7"))
      expect(p).toMatchObject({ parts: ["title"], last: true });
  });

  it("tie each reason of ws-revert-story to the change that wrote it", () => {
    const earlier = of("ws-revert-story", (p) => !p.last).map((p) => p.change);
    expect(new Set(earlier)).toEqual(new Set(["commit:22e1399", "commit:05a16a3"]));
    for (const p of of("ws-revert-story")) expect(p.change).toBe(p.source);
  });
});
