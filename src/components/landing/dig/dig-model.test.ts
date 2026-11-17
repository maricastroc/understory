import { describe, expect, it } from "vitest";
import { messagesFor } from "@/i18n/messages";
import {
  LANDING_NOW,
  landingLines,
  landingVersionsFor,
  landingViewFor,
} from "../demo/landing-fixture";
import { blameLine } from "./blame-line";
import { digModel, monthsBetween } from "./dig-model";

const DAY = 86_400_000;
const model = digModel(landingViewFor("en"), landingLines, landingVersionsFor("en"), LANDING_NOW);

describe("the dig model of the landing case", () => {
  it("orders the chapters by depth: blame's commit, the trail, the issue, the origin", () => {
    expect(model.first.artifact.id).toBe("commit:92f6a3f");
    expect(model.trail.map((r) => r.artifact.id)).toEqual([
      "review:812-1",
      "review:812-0",
      "pr:812",
    ]);
    expect(model.proof.artifact.id).toBe("issue:1187");
    expect(model.origin.artifact.id).toBe("commit:7be210e");
    expect(model.gap.afterId).toBe(model.origin.artifact.id);
  });

  it("puts the probe under the token the question asks about", () => {
    expect(model.code).toBe("for (let attempt = 0; attempt < 3; attempt++) {");
    expect(model.code.slice(model.token?.start, model.token?.end)).toBe("3");
    expect(model.column).toBe(32.5);
    expect(blameLine(model).width + model.column).toBe(69.5);
  });

  it("attaches each clause to the first record it cites", () => {
    expect(model.first.clause?.index).toBe(model.clauses[0].index);
    expect(model.trail[0].clause?.index).toBe(model.clauses[2].index);
    expect(model.proof.clause?.index).toBe(model.clauses[1].index);
    expect(model.origin.clause).toBeNull();
  });

  it("keeps the past readings of the line aligned with today's", () => {
    const pull = model.trail.find((r) => r.artifact.kind === "pull_request");
    expect(pull?.version?.text.slice(model.token?.start, model.token?.end)).toBe("5");
    expect(model.origin.version?.text).toBe("while (true) {");
  });

  it("backs the trail chapter's title: thirteen days from the issue to the merge", () => {
    const merged = Date.parse(model.first.artifact.date);
    const reported = Date.parse(model.proof.artifact.date);
    expect(Math.floor((merged - reported) / DAY)).toBe(13);
    expect(messagesFor("en").landing.dig.trail.title).toMatch(/^Thirteen days in March 2023/);
    expect(messagesFor("pt-BR").landing.dig.trail.title).toMatch(/^Treze dias em março de 2023/);
  });

  it("counts every month of the silence, newest first", () => {
    expect(model.silentMonths).toHaveLength(20);
    expect(model.silentMonths[0]).toBe("2023-02-01");
    expect(model.silentMonths.at(-1)).toBe("2021-07-01");
    expect(monthsBetween("2023-03-02", "2023-02-27")).toEqual([]);
  });

  it("lists one verbatim quote per clause, and three reasons for the reading's title", () => {
    expect(model.quoted.map((q) => q.letter)).toEqual(["A", "E", "B"]);
    expect(model.clauses).toHaveLength(3);
    expect(messagesFor("en").landing.dig.reading.title).toMatch(/^Three reasons/);
  });

  it("is the same case in Portuguese, with the evidence untouched", () => {
    const pt = digModel(
      landingViewFor("pt-BR"),
      landingLines,
      landingVersionsFor("pt-BR"),
      LANDING_NOW,
    );
    expect(pt.proof.excerpt).toBe(model.proof.excerpt);
    expect(pt.column).toBe(model.column);
    expect(pt.clauses.map((c) => c.citations)).toEqual(model.clauses.map((c) => c.citations));
  });
});
