import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRecords } from "./eval-report";
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
      comments: [{ placement: "on the line", outdated: false }],
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

  it("is direct when a cited review comment was made on the line itself", () => {
    expect(specificityOf(facts(), ["review:7-1"])).toBe("direct: a review comment on the line");
    const near = facts();
    near.sources["review:7-1"].comments = [{ placement: "in its hunk", outdated: false }];
    expect(specificityOf(near, ["review:7-1"])).toBe("the change that last changed the line");
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

describe("the kept projection, recomputed through the core", () => {
  it("gives every kept claim the same evidence, link, state and anchoring", () => {
    const kept = JSON.parse(readFileSync("eval/results/2026-10-12-link-projection.json", "utf8"));
    const all = JSON.parse(readFileSync(kept.facts, "utf8")).cases as CaseFacts[];
    const byCase = new Map(all.map((c) => [c.id, c]));
    const rows = new Map<string, Record<string, unknown>>(
      kept.claims.map((p: Record<string, unknown>) => [
        `${p.from}|${p.id}|${p.pass}|${p.claim}`,
        p,
      ]),
    );
    let seen = 0;
    for (const name of kept.files as string[])
      for (const run of parseRecords(readFileSync(`eval/results/${name}`, "utf8")).runs)
        (run.narrative?.claims ?? []).forEach((claim, i) => {
          const checks = (run.narrative?.entailment?.checks ?? []).filter((k) => k.claim === i);
          const cited = checks.length ? checks.map((k) => k.citation) : claim.citations;
          const evidence = evidenceOf(checks[0]?.status ?? null);
          const specificity = specificityOf(byCase.get(run.id), cited);
          expect(rows.get(`${name}|${run.id}|${run.pass}|${i}`)).toMatchObject({
            evidence,
            specificity,
            state: stateOf(evidence, specificity),
            anchoring: anchoringOf(byCase.get(run.id), cited),
          });
          seen++;
        });
    expect(seen).toBe(kept.claims.length);
    expect(seen).toBeGreaterThan(1000);
  });
});
