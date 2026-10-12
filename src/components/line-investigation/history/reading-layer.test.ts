import { readAnswer } from "@understory/core/reading";
import type { DigResult, Evidence } from "@understory/core/types";
import { describe, expect, it } from "vitest";
import kept from "../fixtures/kept-cases.json";
import { extentOf, readingLayer, scopeKey } from "./reading-layer";

const KEPT = kept.cases as unknown as Record<string, DigResult>;
const NOW = Date.parse("2026-10-12T12:00:00Z");
const DAY = 86_400_000;

const layerOf = (id: string, change: (ev: Evidence) => Evidence = (ev) => ev) => {
  const { evidence, narrative } = KEPT[id];
  return readingLayer(readAnswer(change(evidence), narrative), NOW)!;
};

describe("readingLayer", () => {
  it("is nothing where there is no reading", () => {
    expect(readingLayer(null, NOW)).toBeNull();
    expect(readingLayer(undefined, NOW)).toBeNull();
  });

  it("keeps what each change did to the line, by the change's own id", () => {
    const { facts } = layerOf("ws-revert-story");
    expect(Object.fromEntries(facts)).toEqual({
      "commit:9da72fa": { did: "rewrote", before: expect.any(String) },
      "commit:05a16a3": { did: "rewrote", before: expect.any(String) },
      "commit:22e1399": { did: "rewrote", before: expect.any(String) },
      "commit:90021c7": { did: "added", before: null },
    });
  });

  it("keeps the scope of each quoted passage by source and clause, never by source alone", () => {
    const { scopes } = layerOf("ws-revert-story");
    expect(scopes.get(scopeKey("commit:9da72fa", 2))).toEqual({ scope: "line" });
    expect(scopes.get(scopeKey("commit:05a16a3", 1))).toEqual({ scope: "earlier change" });
    expect(scopes.get(scopeKey("commit:22e1399", 0))).toEqual({ scope: "earlier change" });
    expect(scopes.get(scopeKey("commit:9da72fa", 0))).toBeUndefined();
  });

  it("carries where a review comment was made along with the scope of what it says", () => {
    const { scopes } = layerOf("tslint-257");
    expect(scopes.get(scopeKey("review:2369-3", 2))).toEqual({
      scope: "change",
      placement: "another file",
      outdated: expect.any(Boolean),
    });
    expect([...scopes.values()].some((s) => s.scope === "line")).toBe(false);
  });

  it("lists only the changes the walk found and collection did not, newest first", () => {
    const layer = layerOf("ng-http-114");
    expect(layer.earlier.map((c) => [c.id, c.did, c.shownToTheModels])).toEqual([
      ["commit:2420a0a", "added", false],
    ]);
    expect(layer.facts.has("commit:2420a0a")).toBe(false);
    expect(layer.reach).toBeCloseTo((NOW - Date.parse(layer.earlier[0].date)) / DAY, 6);
    expect(layerOf("ws-revert-story").earlier).toEqual([]);
    expect(layerOf("ws-revert-story").reach).toBeNull();
  });

  it("closes the edge where the oldest change added the line, with or without a walk", () => {
    expect(layerOf("ng-http-114").edge).toBeNull();
    expect(layerOf("ng-http-411", (ev) => ({ ...ev, lineage: undefined })).edge).toBeNull();
  });

  it("leaves the edge open where the walk was not made or stopped short", () => {
    expect(layerOf("ng-http-114", (ev) => ({ ...ev, lineage: undefined })).edge).toBe("not read");
    const stopped = layerOf("ng-http-114", (ev) => ({
      ...ev,
      lineage: { entries: ev.lineage!.entries.slice(0, 1), stopped: "request limit" },
    }));
    expect(stopped.edge).toBe("request limit");
    expect(stopped.earlier).toEqual([]);
  });

  it("does not read a file's history as the line's", () => {
    const layer = layerOf("ng-http-411", (ev) => ({
      ...ev,
      lineage: undefined,
      coverage: { ...ev.coverage!, granularity: "file" },
    }));
    expect(layer.history).toBe("the file");
    expect(layer.edge).toBe("not read");
  });

  it("counts the changes found by the walk, and reaches as far back as the oldest of them", () => {
    const layer = layerOf("ng-http-114");
    expect(extentOf(null, 1, 4090)).toEqual({ changes: 1, days: 4090 });
    expect(extentOf(layer, 1, 4090)).toEqual({ changes: 2, days: layer.reach });
    expect(extentOf(layer, 1, null)).toEqual({ changes: 2, days: layer.reach });
    expect(extentOf(layer, 1, 9000)).toEqual({ changes: 2, days: 9000 });
    expect(extentOf(layerOf("ws-revert-story"), 4, 1000)).toEqual({ changes: 4, days: 1000 });
  });

  it("keeps what the walk read and where it stopped, whatever stopped it", () => {
    const [last, first] = KEPT["ng-http-114"].evidence.lineage!.entries;
    const stoppedAt = (lineage: Evidence["lineage"]) =>
      layerOf("ng-http-114", (ev) => ({ ...ev, lineage }));
    const limited = stoppedAt({
      entries: [last, { ...first, did: "rewrote", before: "forEach(toSerialize, noop);" }],
      stopped: "request limit",
    });
    expect([limited.edge, limited.earlier.map((c) => [c.id, c.did])]).toEqual([
      "request limit",
      [["commit:2420a0a", "rewrote"]],
    ]);
    const { sha, date, title } = first;
    const unread = stoppedAt({ entries: [last, { sha, date, title }], stopped: "no patch" });
    expect([unread.edge, unread.earlier.map((c) => [c.id, c.did])]).toEqual([
      "no patch",
      [["commit:2420a0a", undefined]],
    ]);
    const late = stoppedAt({ entries: [], stopped: "time limit" });
    expect([late.edge, late.earlier, late.reach]).toEqual(["time limit", [], null]);
    expect(late.facts.get("commit:18a2e4f")?.did).toBe("rewrote");
  });

  it("does not link a source to the line for sharing its commit", () => {
    expect(layerOf("ng-http-114").scopes.get(scopeKey("commit:18a2e4f", 0))).toEqual({
      scope: "change",
    });
  });

  it("does not link a review comment in another file to the line because the commit is small", () => {
    const { scopes } = layerOf("tslint-257", (ev) => ({
      ...ev,
      code: {
        ...ev.code!,
        change: { ...ev.code!.change!, scope: { files: 1, lines: 22, block: 22 } },
      },
    }));
    expect(scopes.size).toBeGreaterThan(0);
    for (const scope of scopes.values())
      expect(scope).toMatchObject({ scope: "change", placement: "another file" });
  });
});
