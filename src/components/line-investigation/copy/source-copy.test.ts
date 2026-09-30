import { describe, expect, it } from "vitest";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import * as states from "../fixtures/synthetic-states";
import { buildInvestigationView } from "../model/build-investigation-view";
import {
  clauseSources,
  currentCommit,
  excerpt,
  hostCommit,
  provenance,
  sourceStatus,
} from "./source-copy";
import { caseSubject, commitRole } from "./subject-copy";

const now = Date.parse(SYNTHETIC_NOW);
const view = buildInvestigationView(syntheticRetryCap, { now });
const art = (id: string) => view.artifacts.find((a) => a.id === id)!;

describe("clause sources", () => {
  it("lists a clause's own sources in citation order with the quote that backs it", () => {
    const clause = view.clauses[1];
    const sources = clauseSources(clause, view);
    expect(sources.map((s) => s.id)).toEqual(["issue:1187", "pr:812"]);
    const [issue, pr] = sources;
    expect(issue.type === "artifact" && issue.quote?.text).toBe("212 customers were charged twice");
    expect(pr.type === "artifact" && pr.quote).toBeNull();
    expect(sourceStatus(issue, clause)).toEqual({
      text: "✓ Quote found verbatim in the source",
      tone: "evidence",
    });
    expect(sourceStatus(pr, clause).text).toBe("Cited · the verbatim quote is in another source");
  });

  it("shows the silence itself as the evidence of a silent clause", () => {
    const silent = buildInvestigationView(states.syntheticNotRecorded(), { now });
    const sources = clauseSources(silent.clauses[0], silent);
    expect(sources.map((s) => s.type)).toEqual(["gap"]);
  });

  it("keeps a citation that was never collected as a source that cannot be checked", () => {
    const fabricated = buildInvestigationView(states.syntheticFabricated(), { now });
    const clause = fabricated.clauses.find((c) => c.unknownCitations.length > 0)!;
    const missing = clauseSources(clause, fabricated).find((s) => s.type === "missing")!;
    expect(missing.id).toBe("commit:deadbee");
    expect(sourceStatus(missing, clause).text).toMatch(/never collected/);
  });
});

describe("provenance", () => {
  it("walks from an artifact up to the commit that carries it to the line", () => {
    expect(provenance(art("issue:1187"), view.artifacts)).toEqual([
      { relation: null, id: "issue:1187" },
      { relation: "closed by", id: "pr:812" },
      { relation: "merged as", id: "92f6a3f" },
    ]);
    expect(provenance(art("review:812-1"), view.artifacts).map((s) => s.relation)).toEqual([
      null,
      "on",
      "merged as",
    ]);
  });

  it("says whether that commit wrote the line as it reads today", () => {
    const current = currentCommit(view.artifacts);
    const line = caseSubject(view, undefined);
    expect(commitRole(hostCommit(art("issue:1187"), view.artifacts), current, line)).toBe(
      "wrote line 9 as it reads today",
    );
    expect(commitRole(art("commit:7be210e"), current, line)).toBe("an earlier change to line 9");
  });
});

describe("excerpt", () => {
  it("keeps the verbatim quote highlighted after trimming the body around it", () => {
    const issue = art("issue:1187");
    const quote = issue.quotes[0];
    const shown = excerpt(issue, quote.range);
    expect(shown.body.slice(shown.range!.start, shown.range!.end)).toBe(quote.text);
    expect(shown.body.startsWith(issue.title)).toBe(false);
  });
});
