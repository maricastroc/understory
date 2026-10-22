import { describe, expect, it } from "vitest";
import { syntheticCases } from "../fixtures/synthetic-cases";
import { SYNTHETIC_NOW, syntheticRetryCap } from "../fixtures/synthetic-retry-cap";
import { buildInvestigationView } from "../model/build-investigation-view";
import {
  breakMargin,
  breakText,
  caseSubject,
  commitRole,
  historyTitle,
  originText,
  subjectCaption,
  surfaceText,
} from "./subject-copy";

const now = Date.parse(SYNTHETIC_NOW);
const lineView = buildInvestigationView(syntheticRetryCap, { now });
const anchoredResult = syntheticCases.find((c) => !c.result.evidence.location)!.result;
const anchoredView = buildInvestigationView(anchoredResult, { now });
const line = caseSubject(lineView, undefined, "en");
const anchor = caseSubject(anchoredView, anchoredResult.evidence.anchor, "en");

describe("caseSubject", () => {
  it("names a line case by its lines and a drilled case by the artifact it is anchored on", () => {
    expect(line).toEqual({ kind: "line", label: "line 9" });
    expect(anchor).toMatchObject({
      kind: "anchor",
      id: "review:812-1",
      noun: "review",
      ref: "review·dmitri-k",
      label: "review·dmitri-k",
    });
  });
});

describe("history wording", () => {
  it("talks about the line in a line case", () => {
    expect(historyTitle(line, "en")).toBe("History of line 9");
    expect(surfaceText(line, "en")).toBe("line 9 · as it reads now");
    expect(breakText(line, 635, false, "en")).toBe("1y 8m with no change to line 9");
    expect(breakText(line, 1292, true, "en")).toBe("unchanged for 3y 6m");
    expect(breakMargin(line, true, "en")).toBe("unchanged");
    expect(originText(line, "en")).toBe("oldest recorded change to line 9");
  });

  it("does not claim anything about a line in a drilled case", () => {
    for (const text of [
      historyTitle(anchor, "en"),
      surfaceText(anchor, "en"),
      breakText(anchor, 635, false, "en"),
      breakText(anchor, 1292, true, "en"),
      breakMargin(anchor, false, "en"),
      originText(anchor, "en"),
    ]) {
      expect(text).not.toMatch(/\bline\b/);
    }
    expect(historyTitle(anchor, "en")).toBe("Around review·dmitri-k");
    expect(breakText(anchor, 1292, true, "en")).toBe("3y 6m before today");
  });

  it("marks the anchor itself, and only it, as what the case asks about", () => {
    const byId = new Map(anchoredView.artifacts.map((a) => [a.id, a]));
    expect(subjectCaption(anchor, byId.get("review:812-1")!, false, "en")).toBe(
      "the review this case asks about",
    );
    expect(subjectCaption(anchor, byId.get("pr:812")!, true, "en")).toBeNull();
    const commit = lineView.artifacts.find((a) => a.id === "commit:92f6a3f")!;
    expect(subjectCaption(line, commit, true, "en")).toBe("wrote line 9 as it reads today");
    expect(commitRole(commit, commit, anchor, "en")).toBeNull();
  });
});
