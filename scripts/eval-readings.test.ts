import { readFileSync } from "node:fs";
import { readAnswer } from "@understory/core/reading";
import type { Reading } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { parseControls, parseReplay } from "./eval-audit-claims";
import { type Snapshot, compare, controlRows, outcomeOf } from "./eval-readings";
import { parseRecords } from "./eval-report";

const snapshot = JSON.parse(
  readFileSync("eval/results/2026-10-14-reading-evidence.json", "utf8"),
) as Snapshot;
const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence]));

function kept(file: string, id: string, pass: number) {
  const run = parseRecords(readFileSync(`eval/results/${file}`, "utf8")).runs.find(
    (r) => r.id === id && r.pass === pass,
  );
  if (!run?.narrative) throw new Error(`no kept answer for ${id} in ${file}#${pass}`);
  return { narrative: run.narrative, reading: readAnswer(evidence.get(id)!, run.narrative)! };
}

const under = (reading: Reading, claim: number) =>
  reading.changes.flatMap((change) =>
    change.reasons
      .filter((reason) => reason.claim === claim)
      .map((reason) => ({ change: change.id, last: change.last, ...reason })),
  );

const NOW = "2026-10-12-line-attribution.jsonl";

const controls = controlRows(
  parseControls(readFileSync("eval/audit-controls.json", "utf8")),
  parseReplay(
    readFileSync("eval/results/2026-10-12-patch-context-replay-one-question.jsonl", "utf8"),
  ).judgements,
  evidence,
);
const control = (id: string, kind: RegExp) =>
  controls.filter((row) => row.id === id && kind.test(row.kind));

describe("ng-http-114, an explanation the direct link used to hide", () => {
  const { narrative, reading } = kept(NOW, "ng-http-114", 1);

  it("keeps the writer's sentence as an inference about the last change", () => {
    expect(under(reading, 0)).toEqual([
      {
        change: "commit:18a2e4f",
        last: true,
        claim: 0,
        scope: "change",
        standing: "inferred",
        sentence: narrative.claims[0].text,
        passages: [
          {
            source: "commit:18a2e4f",
            text: "fix(httpParamSerializerJQLike): Follow jQuery for index of arrays of objects",
            parts: ["title"],
          },
        ],
      },
    ]);
    expect(narrative.claims[0].text).toContain("include an `index` parameter");
    expect(reading.explanation).toBe("inferred");
  });

  it("does not call it documented: the commit also changed a test file", () => {
    expect(evidence.get("ng-http-114")?.code?.change?.scope).toMatchObject({ files: 2 });
    expect(reading.claims[0].state).toBe("recorded for the change, no specific link shown");
  });
});

describe("q-796, a reason documented for the line", () => {
  const { narrative, reading } = kept(NOW, "q-796", 1);

  it("keeps both sentences documented, from the commit that is the line's block alone", () => {
    for (const claim of [0, 1])
      expect(under(reading, claim)).toEqual([
        expect.objectContaining({
          change: "commit:a4a868e",
          last: true,
          scope: "line",
          standing: "documented for the line",
          sentence: narrative.claims[claim].text,
        }),
      ]);
    expect(under(reading, 1)[0].passages[0]).toMatchObject({
      source: "commit:a4a868e",
      parts: ["message"],
    });
    expect(reading.explanation).toBe("documented for the line");
  });
});

describe("tslint-189, a reason borrowed from a pull request that lists several changes", () => {
  it("is still presented as an inference, with the item of the description it rests on", () => {
    const { narrative, reading } = kept("2026-10-11.jsonl", "tslint-189", 0);
    expect(under(reading, 1)).toEqual([
      expect.objectContaining({
        change: "commit:8b853b2",
        last: true,
        scope: "change",
        standing: "inferred",
        sentence: narrative.claims[1].text,
        passages: [
          {
            source: "pr:3412",
            text: "* try resolve formatter module relative to current directory first",
            parts: ["description"],
          },
        ],
      }),
    ]);
  });

  it("presents the borrowed control the same way in every judgement the audit credited", () => {
    const rows = control("tslint-189", /in the source's words/);
    expect(rows).toHaveLength(8);
    for (const row of rows)
      expect(row).toMatchObject({ now: "inferred for the last change", change: "commit:8b853b2" });
  });

  it("presents nothing for the answer the pipeline gives today, whose one claim is weak", () => {
    const { reading } = kept(NOW, "tslint-189", 2);
    expect(reading.changes.flatMap((c) => c.reasons)).toEqual([]);
    expect(reading.explanation).toBe("not identified");
  });
});

describe("tslint-257, reasons from other parts of the change", () => {
  const { reading } = kept("2026-10-11-audit-first-fix.jsonl", "tslint-257", 1);

  it("keeps the review comments made in another file as context, with no sentence", () => {
    expect(under(reading, 2)).toEqual([
      expect.objectContaining({
        change: "commit:63fc794",
        scope: "change",
        passages: expect.any(Array),
      }),
    ]);
    const [context] = under(reading, 2);
    expect(context.sentence).toBeUndefined();
    expect(context.standing).toBeUndefined();
    for (const passage of context.passages)
      expect(passage).toMatchObject({ parts: ["review comment"], placement: "another file" });
    expect(reading.explanation).toBe("not identified");
  });

  it("still presents the reason of the pull request's description as an inference", () => {
    const rows = control("tslint-257", /^gives the line a reason the source gives/);
    expect(rows.filter((row) => row.status === "supported")).toHaveLength(4);
    for (const row of rows) expect(row.now).toBe("inferred for the last change");
  });
});

describe("machine-32, a discussion about an approach the pull request dropped", () => {
  it("is not excluded for sitting in the discussion, and says that it sits there", () => {
    const { narrative, reading } = kept("2026-10-11-audit-first-fix.jsonl", "machine-32", 0);
    expect(under(reading, 1)).toEqual([
      {
        change: "commit:aa54a5f",
        last: true,
        claim: 1,
        scope: "change",
        standing: "inferred",
        sentence: narrative.claims[1].text,
        passages: [
          {
            source: "pr:2493",
            text: "@nathanleclaire: It does break the marshaling of a host. Might have to use a different approach.",
            parts: ["discussion"],
          },
        ],
      },
    ]);
  });

  it("presents both borrowed controls as inferences wherever the audit credited them", () => {
    for (const row of control("machine-32", /another part/))
      expect(row.now).toBe(
        row.status === "supported" ? "inferred for the last change" : "not established",
      );
  });
});

describe("ws-batch-size, the reason for the value belongs to an earlier change", () => {
  const { narrative, reading } = kept(NOW, "ws-batch-size", 0);

  it("keeps the reason under the commit that halved the size, which took it from 500", () => {
    expect(under(reading, 0)).toEqual([
      expect.objectContaining({
        change: "commit:78ff826",
        last: false,
        scope: "earlier change",
        standing: "inferred",
        sentence: narrative.claims[0].text,
      }),
    ]);
    expect(reading.changes.find((c) => c.id === "commit:78ff826")).toMatchObject({
      did: "rewrote",
      before: "const PAGE_SIZE = 500;",
    });
    expect(narrative.claims[0].text).toContain("413 Payload Too Large");
  });

  it("gives the rename no reason of the halving", () => {
    const rename = reading.changes.find((c) => c.id === "commit:e4dfae7")!;
    expect(rename).toMatchObject({ last: true, before: "const PAGE_SIZE = 250;" });
    for (const reason of rename.reasons) expect(reason.sentence ?? "").not.toContain("413");
    const borrowed = control("ws-batch-size", /another change in the line/);
    expect(borrowed.map((row) => row.now)).toEqual([
      "not established",
      "not established",
      "not established",
      "not established",
    ]);
    for (const row of control("ws-batch-size", /earlier version and backed/))
      expect(row).toMatchObject({
        now: "inferred for an earlier change",
        change: "commit:78ff826",
      });
  });
});

describe("ws-revert-story, reasons that belong to the revert", () => {
  it("keeps each reason under its own change, the revert's under the revert", () => {
    const { narrative, reading } = kept(NOW, "ws-revert-story", 1);
    expect(under(reading, 0).map(({ change, standing }) => [change, standing])).toEqual([
      ["commit:22e1399", "inferred"],
    ]);
    expect(under(reading, 1)).toEqual([
      expect.objectContaining({
        change: "commit:05a16a3",
        last: false,
        standing: "inferred",
        sentence: narrative.claims[1].text,
        passages: [expect.objectContaining({ source: "commit:05a16a3", parts: ["message"] })],
      }),
    ]);
    expect(under(reading, 2).map(({ change, standing }) => [change, standing])).toEqual([
      ["commit:9da72fa", "documented for the line"],
    ]);
  });

  it("keeps a story told up to the last change under the last change, the revert's passage under the revert", () => {
    const { narrative, reading } = kept(NOW, "ws-revert-story", 0);
    expect(
      under(reading, 1).map(({ change, standing, sentence }) => [change, standing, sentence]),
    ).toEqual([
      ["commit:05a16a3", undefined, undefined],
      ["commit:9da72fa", "documented for the line", narrative.claims[1].text],
    ]);
  });

  it("keeps no sentence for the control that gives the first drop the revert's reason", () => {
    const rows = control("ws-revert-story", /another change in the line/);
    expect(
      rows.filter((row) => row.status === "supported").map((row) => [row.now, row.change]),
    ).toEqual([["context only", null]]);
  });
});

describe("ng-http-411, a true sentence the audit held at weak", () => {
  it("is not promoted: no sentence, kept apart as insufficient", () => {
    const { narrative, reading } = kept(NOW, "ng-http-411", 0);
    expect(reading.changes.flatMap((c) => c.reasons)).toEqual([]);
    expect(reading.unsustained).toEqual([
      { claim: 0, text: narrative.claims[0].text, quality: "insufficient" },
    ]);
    expect(outcomeOf(reading, 0)).toBe("not established");
    expect(reading.explanation).toBe("not identified");
  });
});

describe("the kept comparison, recomputed from the kept evidence", () => {
  const keptOut = JSON.parse(
    readFileSync("eval/results/2026-10-14-reading-projection.json", "utf8"),
  );
  const again = JSON.parse(JSON.stringify(compare(snapshot)));

  it("gives the same rows and the same tables", () => {
    expect(again.files).toEqual(keptOut.files);
    expect(again.controls).toEqual(keptOut.controls);
    expect(again.tables).toEqual(keptOut.tables);
  });

  it("changes no answer documented for the line, and gives no false control a sentence", () => {
    expect(keptOut.tables.documented.differ).toEqual([]);
    expect(keptOut.tables.documented.documentedNow).toBe(
      keptOut.tables.documented.documentedInTheKeptProjection,
    );
    expect(keptOut.tables.controls.now.false).toBeUndefined();
    expect(keptOut.tables.controls.outcome.false).toEqual({ "not established": 88 });
  });

  it("finds every cited source in the evidence collected today", () => {
    for (const table of Object.values(keptOut.tables.runs) as Array<Record<string, number>>)
      expect(table.sourcesNotCollectedToday).toBe(0);
  });
});
