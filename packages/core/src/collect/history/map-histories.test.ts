import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrLookup } from "../../types";
import { clearHistoryMemory } from "./history-cache";
import { type HistorySource, mapHistories, MAX_MAP_BYTES } from "./map-histories";
import type { SpanLike } from "./summarize";

const file = (path: string, size = 100) => ({ path, blobSha: `${path}-blob`, size });
const spans = (sha: string): SpanLike[] => [
  { startLine: 1, endLine: 3, sha, date: "2023-03-15T00:00:00Z" },
  { startLine: 4, endLine: 4, sha: "old", date: "2021-06-18T00:00:00Z" },
];

function source(over: Partial<HistorySource> = {}) {
  const blame = vi.fn(async (_ref: string, paths: string[]) => {
    return new Map<string, SpanLike[] | Error>(paths.map((p) => [p, spans(`${p}-c`)]));
  });
  const lookups = vi.fn(async (oids: string[]) => {
    return new Map<string, PrLookup>(oids.map((o) => [o, o === "old" ? "none" : "found"]));
  });
  return { key: "github:acme/pay", blame, lookups, maxLookups: 100, ...over };
}

beforeEach(() => clearHistoryMemory());

describe("mapHistories", () => {
  it("maps a batch with one blame call and one lookup call, then serves it from cache for free", async () => {
    const s = source();
    const files = [file("a.ts"), file("b.ts"), file("c.ts")];
    const mapped = await mapHistories(s, "head", files, "map");
    expect(s.blame).toHaveBeenCalledTimes(1);
    expect(s.lookups).toHaveBeenCalledTimes(1);
    expect(mapped.map((h) => h.status)).toEqual(["mapped", "mapped", "mapped"]);
    expect(mapped[0].marks.map((m) => [m.lines, m.prLookup])).toEqual([
      [3, "found"],
      [1, "none"],
    ]);

    const cached = await mapHistories(source(), "head", files, "cached");
    expect(cached).toEqual(mapped);
  });

  it("cached mode never calls the collectors and returns only hits", async () => {
    const s = source();
    await mapHistories(s, "head", [file("a.ts")], "map");
    const fresh = source();
    const out = await mapHistories(fresh, "head", [file("a.ts"), file("b.ts")], "cached");
    expect(out.map((h) => h.path)).toEqual(["a.ts"]);
    expect(fresh.blame).not.toHaveBeenCalled();
    expect(fresh.lookups).not.toHaveBeenCalled();
  });

  it("a new blob is a new cache key", async () => {
    await mapHistories(source(), "head", [file("a.ts")], "map");
    const moved = { ...file("a.ts"), blobSha: "changed" };
    expect(await mapHistories(source(), "head", [moved], "cached")).toEqual([]);
  });

  it("keeps unknown lookups unknown: failed lookups are neutral, never 'none'", async () => {
    const s = source({
      lookups: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const [h] = await mapHistories(s, "head", [file("a.ts")], "map");
    expect(h.marks.map((m) => m.prLookup)).toEqual(["failed", "failed"]);
  });

  it("without PR data every mark stays not checked", async () => {
    const [h] = await mapHistories(source({ lookups: null }), "head", [file("a.ts")], "map");
    expect(h.marks.map((m) => m.prLookup)).toEqual(["skipped", "skipped"]);
  });

  it("caps lookups; the rest stay not checked", async () => {
    const s = source({ maxLookups: 1 });
    const [h] = await mapHistories(s, "head", [file("a.ts")], "map");
    expect(h.marks.map((m) => m.prLookup).sort()).toEqual(["found", "skipped"]);
  });

  it("marks failed blame as unavailable and huge files as too large, without caching them", async () => {
    const s = source({
      blame: vi.fn(async (_ref: string, paths: string[]) => {
        return new Map<string, SpanLike[] | Error>(paths.map((p) => [p, new Error("timeout")]));
      }),
    });
    const out = await mapHistories(
      s,
      "head",
      [file("a.ts"), file("big.ts", MAX_MAP_BYTES + 1)],
      "map",
    );
    expect(out.map((h) => [h.path, h.status, h.error])).toEqual([
      ["a.ts", "unavailable", "timeout"],
      ["big.ts", "too-large", undefined],
    ]);
    expect(await mapHistories(source(), "head", [file("a.ts")], "cached")).toEqual([]);
  });

  it("takes at most five files per batch", async () => {
    const s = source();
    const out = await mapHistories(
      s,
      "head",
      Array.from({ length: 7 }, (_, i) => file(`f${i}.ts`)),
      "map",
    );
    expect(out).toHaveLength(5);
    expect(vi.mocked(s.blame).mock.calls[0][1]).toHaveLength(5);
  });

  it("flags a cut when a mark is a shallow boundary", async () => {
    const s = source({
      blame: vi.fn(async (_ref: string, paths: string[]) => {
        return new Map<string, SpanLike[] | Error>(
          paths.map((p) => [
            p,
            [{ startLine: 1, endLine: 2, sha: "g", date: "2024-01-01T00:00:00Z", boundary: true }],
          ]),
        );
      }),
    });
    const [h] = await mapHistories(s, "head", [file("a.ts")], "map");
    expect(h.cut).toBe(true);
  });
});
