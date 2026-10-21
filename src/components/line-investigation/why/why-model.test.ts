import { readAnswer } from "@understory/core/reading";
import type { DigResult } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import controls from "../fixtures/control-cases.json";
import kept from "../fixtures/kept-cases.json";
import { presented, type WhyModel, whyModel } from "./why-model";

const KEPT = kept.cases as unknown as Record<string, DigResult>;
const CONTROLS = controls.cases as unknown as Record<string, DigResult>;

const read = (result: DigResult) => whyModel(readAnswer(result.evidence, result.narrative)!);
const claimText = (result: DigResult, claim: number) => result.narrative!.claims[claim].text;

const shown = (model: WhyModel) =>
  model.changes.map((change) => ({
    change: change.id,
    last: change.last,
    entries: change.entries.map((entry) => ({
      claim: entry.claim,
      standing: entry.standing,
      sentence: entry.sentence,
      passages: entry.passages.map((p) => ({
        source: p.source,
        parts: p.parts,
        placement: p.placement,
        text: p.text,
      })),
    })),
  }));

describe("ng-http-114, an explanation the direct link used to hide", () => {
  const result = KEPT["ng-http-114"];
  const model = read(result);

  it("keeps the writer's sentence as a likely explanation of the last change, with its commit title", () => {
    expect(model.explanation).toBe("inferred");
    expect(shown(model)).toEqual([
      {
        change: "commit:18a2e4f",
        last: true,
        entries: [
          {
            claim: 0,
            standing: "inferred",
            sentence: claimText(result, 0),
            passages: [
              {
                source: "commit:18a2e4f",
                parts: ["title"],
                placement: undefined,
                text: "fix(httpParamSerializerJQLike): Follow jQuery for index of arrays of objects",
              },
            ],
          },
        ],
      },
    ]);
    expect(model.unsustained).toEqual([]);
  });
});

describe("q-796, a reason documented for the line", () => {
  const result = KEPT["q-796"];
  const model = read(result);

  it("keeps both sentences documented, under the commit that is the line's block alone", () => {
    expect(model.explanation).toBe("documented for the line");
    expect(shown(model)).toEqual([
      {
        change: "commit:a4a868e",
        last: true,
        entries: [0, 1].map((claim) =>
          expect.objectContaining({
            claim,
            standing: "documented for the line",
            sentence: claimText(result, claim),
          }),
        ),
      },
    ]);
  });
});

describe("ws-revert-story, reasons of earlier changes", () => {
  const result = KEPT["ws-revert-story"];
  const model = read(result);

  it("lists the changes newest first, as the history does", () => {
    expect(model.changes.map((c) => [c.id, c.last])).toEqual([
      ["commit:9da72fa", true],
      ["commit:05a16a3", false],
      ["commit:22e1399", false],
    ]);
  });

  it("keeps each sentence under the change whose record it rests on, and gives the last change only its own", () => {
    expect(
      shown(model).map(({ change, entries }) => ({
        change,
        entries: entries.map(({ claim, standing, sentence, passages }) => ({
          claim,
          standing,
          sentence,
          sources: passages.map((p) => p.source),
        })),
      })),
    ).toEqual([
      {
        change: "commit:9da72fa",
        entries: [
          {
            claim: 2,
            standing: "documented for the line",
            sentence: claimText(result, 2),
            sources: ["commit:9da72fa"],
          },
        ],
      },
      {
        change: "commit:05a16a3",
        entries: [
          {
            claim: 1,
            standing: "inferred",
            sentence: claimText(result, 1),
            sources: ["commit:05a16a3"],
          },
        ],
      },
      {
        change: "commit:22e1399",
        entries: [
          {
            claim: 0,
            standing: "inferred",
            sentence: claimText(result, 0),
            sources: ["commit:22e1399"],
          },
        ],
      },
    ]);
  });
});

describe("tslint-189, a reason borrowed from another item of the pull request, credited by the audit", () => {
  const result = CONTROLS["tslint-189"];
  const model = read(result);

  it("is a written control, judged supported by the kept audit", () => {
    expect(result.narrative!.claims.map((c) => c.text)).toEqual([
      "The condition was rewritten to allow uncompiled custom formatters, as uncompiled rules were already allowed.",
    ]);
    expect(result.narrative!.entailment!.checks.map((c) => c.status)).toEqual(["supported"]);
  });

  it("is shown as a likely explanation of the last change, never as documented for the line", () => {
    expect(model.explanation).toBe("inferred");
    expect(shown(model)).toEqual([
      {
        change: "commit:8b853b2",
        last: true,
        entries: [
          {
            claim: 0,
            standing: "inferred",
            sentence: claimText(result, 0),
            passages: [
              {
                source: "pr:3412",
                parts: ["description"],
                placement: undefined,
                text: "* formatterLoader * allow uncompiled custom formatters (we already allow uncompiled rules)",
              },
            ],
          },
        ],
      },
    ]);
  });
});

describe("tslint-257, a credited claim that rests only on comments made in another file", () => {
  const result = KEPT["tslint-257"];
  const model = read(result);

  it("identifies no reason, and keeps the comments as the change's record without the writer's sentence", () => {
    expect(model.explanation).toBe("not identified");
    expect(shown(model)).toEqual([
      {
        change: "commit:63fc794",
        last: true,
        entries: [
          {
            claim: 2,
            standing: null,
            sentence: null,
            passages: [
              expect.objectContaining({ parts: ["review comment"], placement: "another file" }),
              expect.objectContaining({ parts: ["review comment"], placement: "another file" }),
            ],
          },
        ],
      },
    ]);
    expect(presented(model)).toEqual([]);
  });

  it("keeps the three weak claims apart, with what the audit found", () => {
    expect(model.unsustained).toEqual(
      [0, 1, 3].map((claim) => ({
        claim,
        text: claimText(result, claim),
        quality: "insufficient",
      })),
    );
  });
});

describe("ng-http-411, a useful claim the audit held weak", () => {
  const result = KEPT["ng-http-411"];
  const model = read(result);

  it("is not promoted: no reason identified, the claim kept as not established", () => {
    expect(model.explanation).toBe("not identified");
    expect(presented(model)).toEqual([]);
    expect(model.unsustained).toEqual([
      { claim: 0, text: claimText(result, 0), quality: "insufficient" },
    ]);
  });

  it("still says which change last touched the line", () => {
    expect(shown(model)).toEqual([{ change: "commit:1e90d03", last: true, entries: [] }]);
    expect(model.changes[0].title).toBe(
      "feat($http): support sending XSRF token to whitelisted origins",
    );
    expect(model.changes[0].did).toBe("added");
  });
});
