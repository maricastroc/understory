import { describe, expect, it } from "vitest";
import {
  type CaseFacts,
  anchoringOf,
  crossTab,
  evidenceOf,
  isCausal,
  specificityOf,
  stateOf,
} from "./eval-link-states";

const facts = (over: Partial<CaseFacts> = {}): CaseFacts => ({
  id: "a",
  granularity: "line",
  alone: false,
  sources: {
    "commit:last": { kind: "commit", link: "this change", comments: [] },
    "pr:7": { kind: "pull_request", link: "this change", comments: [] },
    "commit:first": { kind: "commit", link: "another change", comments: [] },
    "review:7-0": {
      kind: "review",
      link: "this change",
      comments: [{ placement: "another file", outdated: true }],
    },
    "review:7-1": {
      kind: "review",
      link: "this change",
      comments: [{ placement: "in its hunk", outdated: false }],
    },
    "review:7-2": { kind: "review", link: "this change", comments: [] },
  },
  ...over,
});

describe("the quality of the evidence", () => {
  it("keeps absence, insufficiency and refutation apart", () => {
    expect(evidenceOf("supported")).toBe("stated by a cited source");
    expect(evidenceOf("weak")).toBe("insufficient");
    expect(evidenceOf("unsupported")).toBe("refuted");
    expect(evidenceOf(null)).toBe("absent");
  });
});

describe("the specificity of the link", () => {
  it("is the change when the source belongs to it and the change did other things", () => {
    expect(specificityOf(facts(), ["pr:7"])).toBe("the change that last changed the line");
  });

  it("is direct when the change is the line's block and nothing else", () => {
    expect(specificityOf(facts({ alone: true }), ["commit:last"])).toBe(
      "direct: the change is this block alone",
    );
  });

  it("is direct when a cited review comment sits in the line's hunk", () => {
    expect(specificityOf(facts(), ["review:7-1"])).toBe("direct: a review comment on the line");
  });

  it("does not drop a review comment made in another file below the change it belongs to", () => {
    expect(specificityOf(facts(), ["review:7-0"])).toBe("the change that last changed the line");
  });

  it("takes the most specific of the sources a claim cites", () => {
    expect(specificityOf(facts(), ["commit:first", "pr:7"])).toBe(
      "the change that last changed the line",
    );
    expect(specificityOf(facts(), ["commit:first"])).toBe("another change in the line's history");
  });

  it("is the file's history when only that could be read, and none without a known source", () => {
    expect(specificityOf(facts({ granularity: "file", alone: true }), ["commit:last"])).toBe(
      "the file's history",
    );
    expect(specificityOf(facts(), ["commit:unknown"])).toBe("none");
    expect(specificityOf(undefined, ["commit:last"])).toBe("none");
  });
});

describe("the state read off the two", () => {
  it("needs the evidence stated before the link counts", () => {
    expect(stateOf("stated by a cited source", "direct: the change is this block alone")).toBe(
      "directly linked to the line",
    );
    expect(stateOf("stated by a cited source", "the change that last changed the line")).toBe(
      "recorded for the change, no specific link shown",
    );
    expect(stateOf("stated by a cited source", "another change in the line's history")).toBe(
      "recorded for the change, no specific link shown",
    );
    expect(stateOf("insufficient", "direct: the change is this block alone")).toBe("not sustained");
    expect(stateOf("refuted", "the change that last changed the line")).toBe("not sustained");
    expect(stateOf("absent", "none")).toBe("not sustained");
  });
});

describe("where a cited review comment sits", () => {
  it("says so, and whether its position is outdated", () => {
    expect(anchoringOf(facts(), ["review:7-0"])).toBe("in another file, outdated");
    expect(anchoringOf(facts(), ["review:7-1"])).toBe("on the line or in its hunk");
    expect(anchoringOf(facts(), ["review:7-2"])).toBe("a review with no placed comment");
    expect(anchoringOf(facts(), ["pr:7"])).toBeNull();
  });
});

describe("causal wording", () => {
  it("is found in a claim that gives a reason, in English and in Portuguese", () => {
    expect(isCausal("The retries were capped at three to prevent double billing.")).toBe(true);
    expect(isCausal("This line was added because the vendor rejects larger pages.")).toBe(true);
    expect(isCausal("O limite foi fixado em 3 para evitar dupla cobrança.")).toBe(true);
    expect(isCausal("Commit 8de2db9 rewrote the declaration from var to const.")).toBe(false);
  });
});

describe("crossTab", () => {
  it("counts rows by two keys", () => {
    const rows = [
      { a: "x", b: "1" },
      { a: "x", b: "1" },
      { a: "y", b: "2" },
    ];
    expect(
      crossTab(
        rows,
        (r) => r.a,
        (r) => r.b,
      ),
    ).toEqual({ x: { "1": 2 }, y: { "2": 1 } });
  });
});
