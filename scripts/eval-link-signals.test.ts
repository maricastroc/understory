import type { Artifact } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import {
  type Signals,
  blockAround,
  byStructureAlone,
  changedTerms,
  closest,
  commentsOf,
  elsewhereTerms,
  judgeThenStructure,
  linkOf,
  patchRows,
  placementOf,
  structureAsProof,
  terms,
  whatItDid,
} from "./eval-link-signals";

const artifact = (id: string, kind: Artifact["kind"], parentId?: string): Artifact => ({
  id,
  kind,
  title: id,
  body: "",
  url: "",
  date: "2024-01-01T00:00:00Z",
  ...(parentId ? { parentId } : {}),
});

const signals = (over: Partial<Signals> = {}): Signals => ({
  did: "added",
  links: ["this change"],
  alone: false,
  namesLine: false,
  namesBlock: false,
  namesElsewhere: false,
  ...over,
});

describe("terms", () => {
  it("splits identifiers into their words and keeps the whole", () => {
    expect([...terms("xsrfWhitelistedOrigins")].sort()).toEqual([
      "origin",
      "whitelisted",
      "xsrf",
      "xsrfwhitelistedorigin",
    ]);
  });

  it("keeps numbers and language keywords, and drops function words", () => {
    expect(terms("const limit = 3 because of the vendor")).toEqual(
      new Set(["const", "limit", "3", "vendor"]),
    );
  });
});

describe("what a change did to a line", () => {
  it("is the terms on one side only when the line was rewritten", () => {
    expect(changedTerms("var map = get();", "const map = get();")).toEqual(
      new Set(["var", "const"]),
    );
    expect(changedTerms(null, "return index;")).toEqual(new Set(["return", "index"]));
  });

  it("tells a rewrite from a change of spacing, and a move from an addition", () => {
    expect(whatItDid("  return total;", "return total;", [])).toBe("respaced");
    expect(whatItDid("return total + tax;", "return total;", [])).toBe("rewrote");
    expect(whatItDid("const a = read(file);", null, ["  const a = read(file);"])).toBe("moved");
    expect(whatItDid("const a = read(file);", null, ["const b = 1;"])).toBe("added");
  });

  it("does not call a brace or a blank line moved", () => {
    expect(whatItDid("}", null, ["}"])).toBe("added");
  });

  it("finds the run of changed rows a line sits in", () => {
    const patch = ["@@ -1,3 +1,4 @@", " keep();", "-old();", "+first();", "+second();", " keep();"];
    expect(blockAround(patch.join("\n"), "second();")).toEqual([
      "-old();",
      "+first();",
      "+second();",
    ]);
    expect(blockAround(patch.join("\n"), "missing();")).toBeNull();
    expect(patchRows(patch.join("\n"))).toEqual({
      added: ["first();", "second();"],
      removed: ["old();"],
    });
  });
});

describe("which change a source belongs to", () => {
  const last = artifact("commit:bbb", "commit");
  const earlier = artifact("commit:aaa", "commit");
  const pr = artifact("pr:7", "pull_request", "commit:bbb");
  const review = artifact("review:7-0", "review", "pr:7");
  const stray = artifact("issue:9", "issue");
  const byId = new Map([last, earlier, pr, review, stray].map((a) => [a.id, a]));

  it("follows a review to its pull request and to the commit that merged it", () => {
    expect(linkOf(review, last.id, byId)).toBe("this change");
    expect(linkOf(pr, last.id, byId)).toBe("this change");
    expect(linkOf(last, last.id, byId)).toBe("this change");
  });

  it("names another change, and a source that hangs from none", () => {
    expect(linkOf(earlier, last.id, byId)).toBe("another change");
    expect(linkOf(stray, last.id, byId)).toBe("unlinked");
  });
});

describe("the passage a claim leans on", () => {
  it("is the sentence that shares most terms with it", () => {
    const body =
      "Rewrite enable/disable logic.\nRules are not responsible for disabling themselves.";
    expect(closest(body, "added so that rules no longer disable themselves")).toBe(
      "Rules are not responsible for disabling themselves.",
    );
  });

  it("names something elsewhere when the change touched it outside the block", () => {
    const passage = terms("I removed filterFailures entirely");
    expect(
      elsewhereTerms(passage, terms("readFileSync(filePath)"), terms("filterFailures()")),
    ).toEqual(["filterfailure", "filter", "failure"]);
    expect(elsewhereTerms(passage, terms("filterFailures()"), terms("filterFailures()"))).toEqual(
      [],
    );
  });
});

describe("three ways of using the structure", () => {
  it("refutes on facts alone and never credits", () => {
    expect(byStructureAlone(signals())).toBe("inconclusive");
    expect(byStructureAlone(signals({ alone: true, namesLine: true }))).toBe("inconclusive");
    expect(byStructureAlone(signals({ did: "moved" }))).toBe("reject");
    expect(byStructureAlone(signals({ did: "respaced" }))).toBe("reject");
    expect(byStructureAlone(signals({ links: ["unlinked"] }))).toBe("reject");
  });

  it("credits on a hint when the structure is taken as proof", () => {
    expect(structureAsProof(signals({ alone: true }))).toBe("credit");
    expect(structureAsProof(signals({ namesLine: true }))).toBe("credit");
    expect(structureAsProof(signals({ namesBlock: true }))).toBe("inconclusive");
    expect(structureAsProof(signals({ links: ["another change"], alone: true }))).toBe(
      "inconclusive",
    );
  });

  it("lets the structure confirm a judgement, never make one", () => {
    const judge = { supported: 3, judged: 4 };
    expect(judgeThenStructure(signals({ namesLine: true }), judge)).toEqual([
      "credit",
      "credit",
      "credit",
      "reject",
    ]);
    expect(judgeThenStructure(signals(), judge)).toEqual([
      "inconclusive",
      "inconclusive",
      "inconclusive",
      "reject",
    ]);
    expect(judgeThenStructure(signals({ did: "moved", namesLine: true }), judge)).toEqual([
      "reject",
      "reject",
      "reject",
      "reject",
    ]);
  });

  it("refuses on a passage about elsewhere only when told that hints may refute", () => {
    const judge = { supported: 1, judged: 1 };
    const elsewhere = signals({ namesElsewhere: true });
    expect(judgeThenStructure(elsewhere, judge)).toEqual(["inconclusive"]);
    expect(judgeThenStructure(elsewhere, judge, true)).toEqual(["reject"]);
    expect(judgeThenStructure({ ...elsewhere, namesLine: true }, judge, true)).toEqual(["credit"]);
  });
});

describe("where a review comment was placed", () => {
  const hunk = ["@@ -10,3 +10,4 @@", " keep();", "+const a = read(file);", "+apply(a);"].join("\n");
  const comment = (path: string, diffHunk = hunk) => ({
    path,
    diffHunk,
    body: "It is not necessary to check the severity here.",
    outdated: false,
  });

  it("is on the line when the hunk it was made on ends there", () => {
    expect(placementOf(comment("src/linter.ts"), "src/linter.ts", "  apply(a);")).toBe(
      "on the line",
    );
  });

  it("is in the line's hunk when the line is shown above the commented one", () => {
    expect(placementOf(comment("src/linter.ts"), "src/linter.ts", "const a = read(file);")).toBe(
      "in its hunk",
    );
  });

  it("is elsewhere in the file, or in another file", () => {
    expect(placementOf(comment("src/linter.ts"), "src/linter.ts", "return source;")).toBe(
      "same file, elsewhere",
    );
    expect(placementOf(comment("src/ruleLoader.ts"), "src/linter.ts", "apply(a);")).toBe(
      "another file",
    );
  });

  it("does not take a removed row for the line as it stands", () => {
    const removed = ["@@ -1,2 +1,2 @@", "-apply(a);", "+applyAll(a);"].join("\n");
    expect(placementOf(comment("a.ts", removed), "a.ts", "apply(a);")).toBe("same file, elsewhere");
  });

  it("finds the comments a collected review holds, by their text", () => {
    const review = {
      ...artifact("review:7-0", "review", "pr:7"),
      body: "@someone: It is not necessary to check the severity here.",
    };
    const other = { ...comment("b.ts"), body: "Why not reuse the map?" };
    expect(commentsOf(review, [comment("a.ts"), other])).toEqual([comment("a.ts")]);
  });
});
