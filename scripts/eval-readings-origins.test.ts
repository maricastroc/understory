import { readFileSync } from "node:fs";
import { FOLDED_COMMENT } from "@understory/core/record-part";
import { readAnswer } from "@understory/core/reading";
import type { Reading, VerifiedNarrative } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import { parseControls, parseReplay } from "./eval-audit-claims";
import {
  type KeptOrigins,
  type PassageOrigin,
  originIndex,
  passageKey,
} from "./eval-passage-origin";
import { type Snapshot, controlNarrative } from "./eval-readings";
import { parseRecords } from "./eval-report";

const snapshot = JSON.parse(
  readFileSync("eval/results/2026-10-14-reading-evidence.json", "utf8"),
) as Snapshot;
const evidence = new Map(snapshot.cases.map((c) => [c.id, c.evidence]));
const kept = JSON.parse(
  readFileSync("eval/results/2026-10-13-passage-origins.json", "utf8"),
) as KeptOrigins & { files: string[]; replay: string };
const origins = originIndex(kept);

function quoting(source: string, quote: string): VerifiedNarrative {
  return {
    answer: "",
    answerable: true,
    recorded: true,
    citations: [source],
    claims: [{ text: "", citations: [source], grounded: true }],
    grounded: true,
    unknownCitations: [],
    ungroundedClaims: 0,
    confidence: { score: 0, level: "low", primarySources: 0, corroborating: 0, contradicting: 0 },
    entailment: {
      checked: true,
      checks: [{ citation: source, claim: 0, status: "supported", quote, reason: "" }],
      supported: 1,
      misattributed: 0,
    },
  };
}

const placed = (reading: Reading) =>
  reading.changes.flatMap((change) =>
    change.reasons.flatMap((reason) =>
      reason.passages.map((passage) => ({
        change: change.id,
        last: change.last,
        source: passage.source,
        text: passage.text,
        parts: passage.parts ?? [],
        ...(passage.placement ? { placement: passage.placement, outdated: passage.outdated } : {}),
      })),
    ),
  );

const asKept = (origin: PassageOrigin) => ({
  change: origin.change,
  last: origin.last,
  source: origin.source,
  text: origin.quote,
  parts: origin.parts,
  ...(origin.placement ? { placement: origin.placement, outdated: origin.outdated } : {}),
});

const read = (origin: PassageOrigin) =>
  placed(readAnswer(evidence.get(origin.id)!, quoting(origin.source, origin.quote))!);

describe("the core reads each passage where #66 kept it", () => {
  it("in the same part of its record, under the same change, for all 161 kept passages", () => {
    expect(kept.passages).toHaveLength(161);
    expect(kept.passages.map(read)).toEqual(kept.passages.map((origin) => [asKept(origin)]));
  });

  it("with the same history of changes, for all 20 cases", () => {
    expect(kept.cases).toHaveLength(20);
    expect(
      kept.cases.map((c) =>
        readAnswer(evidence.get(c.id)!, null)!.changes.map((change) => ({
          id: change.id,
          date: change.date,
          title: change.title,
          last: change.last,
          ...(change.did ? { did: change.did, before: change.before ?? null } : {}),
        })),
      ),
    ).toEqual(kept.cases.map((c) => c.changes));
  });

  it("under an earlier change wherever #66 found one, in the six cases that have it", () => {
    const earlier = kept.passages.filter((origin) => !origin.last);
    expect([...new Set(earlier.map((origin) => origin.id))]).toEqual([
      "retry-cap",
      "jitter",
      "bug-phrasing",
      "ws-batch-size",
      "ws-revert-story",
      "pt-retry-cap",
    ]);
    for (const origin of earlier) expect(read(origin)).toEqual([asKept(origin)]);
  });

  it("with its place in another file when the audit quoted a review comment with the collector's prefix", () => {
    const prefixed = kept.passages.filter(
      (origin) => origin.kind === "review" && FOLDED_COMMENT.test(origin.quote),
    );
    expect(prefixed.map((origin) => origin.id)).toEqual(Array(4).fill("tslint-257"));
    for (const origin of prefixed)
      expect(read(origin)).toEqual([
        expect.objectContaining({ parts: ["review comment"], placement: "another file" }),
      ]);
  });
});

describe("the passages the core keeps when it reads the kept answers", () => {
  const compared = (id: string, reading: Reading) =>
    placed(reading).map((passage) => ({
      id,
      passage,
      origin: origins.get(passageKey(id, passage.source, passage.text)),
    }));

  const runs = kept.files.flatMap((file) =>
    parseRecords(readFileSync(`eval/results/${file}`, "utf8")).runs.flatMap((run) => {
      const ev = evidence.get(run.id);
      const reading = ev && run.narrative ? readAnswer(ev, run.narrative) : null;
      return reading ? compared(run.id, reading) : [];
    }),
  );

  const judgements = parseReplay(readFileSync(kept.replay, "utf8")).judgements;
  const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8")).flatMap(
    (control) =>
      judgements
        .filter((j) => j.kind && j.id === control.id && j.claim === control.text && j.status)
        .flatMap((j) => {
          const ev = evidence.get(control.id)!;
          const reading = readAnswer(ev, controlNarrative(control, j, ev));
          return reading ? compared(control.id, reading) : [];
        }),
  );

  it("are, in every kept run, passages #66 located, each where #66 kept it", () => {
    expect(runs).toHaveLength(763);
    for (const { passage, origin } of runs) expect(passage).toEqual(origin && asKept(origin));
  });

  it("are, in every kept judgement of a written control, passages #66 located, each where #66 kept it", () => {
    expect(controls).toHaveLength(69);
    for (const { passage, origin } of controls) expect(passage).toEqual(origin && asKept(origin));
  });
});
