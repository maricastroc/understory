import { readFileSync } from "node:fs";
import { LINEAGE_LIMITS } from "@understory/core/collect/lineage";
import type { Evidence } from "@understory/core/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "./eval-readings";
import { answerTimes, ranOn, summarize, timedWalk, type Walk } from "./eval-walk";

const snapshot = JSON.parse(
  readFileSync("eval/results/2026-10-14-reading-evidence.json", "utf8"),
) as Snapshot;
const hosted = snapshot.cases.find((c) => c.id === "ng-http-114")!.evidence as Evidence;

afterEach(() => vi.unstubAllGlobals());

describe("timing one walk", () => {
  it("records each request the walk sends, with its outcome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );
    const walk = await timedWalk(hosted, LINEAGE_LIMITS);
    expect(walk.stopped).toBe("no patch");
    expect(walk.requests).toEqual([expect.objectContaining({ kind: "commit", outcome: "404" })]);
    expect(ranOn(walk)).toBe(0);
  });

  it("counts a request cut at the time limit as aborted, not as running on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            ),
          ),
      ),
    );
    const walk = await timedWalk(hosted, { ...LINEAGE_LIMITS, ms: 30 });
    expect(walk.stopped).toBe("time limit");
    expect(walk.requests.map((r) => r.outcome)).toEqual(["aborted"]);
    expect(ranOn(walk)).toBe(0);
  });

  it("counts a request that ignores the cut as running on after the walk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) =>
            setTimeout(() => resolve(new Response("{}", { status: 404 })), 80),
          ),
      ),
    );
    const walk = await timedWalk(hosted, { ...LINEAGE_LIMITS, ms: 30 });
    expect(walk.stopped).toBe("time limit");
    expect(walk.requests.map((r) => r.outcome)).toEqual(["404"]);
    expect(ranOn(walk)).toBe(1);
  });
});

describe("the kept measurements", () => {
  const read = (file: string) =>
    JSON.parse(readFileSync(`eval/results/${file}`, "utf8")) as {
      answers: string;
      summary: ReturnType<typeof summarize>;
      walks: Walk[];
    };
  const now = read("2026-10-21-walk-latency.json");
  const before = read("2026-10-21-walk-latency-before-71.json");

  it("give the summary their walks give", () => {
    for (const kept of [now, before])
      expect(summarize(kept.walks, answerTimes(readFileSync(kept.answers, "utf8")))).toEqual(
        kept.summary,
      );
  });

  it("never send more than six requests on a hosted repository", () => {
    for (const kept of [now, before])
      for (const walk of kept.walks) expect(walk.requests.length).toBeLessThanOrEqual(6);
  });

  it("show the request in flight at the cut aborted with #71, and running to its end before it", () => {
    const cut = (kept: typeof now) =>
      kept.walks.filter((w) => w.group === "hosted" && w.limit === 300);
    expect(cut(now)).toHaveLength(36);
    expect(cut(now).flatMap((w) => w.requests.map((r) => r.outcome))).toEqual(
      Array(36).fill("aborted"),
    );
    expect(now.summary["hosted · 300 ms"].ranOnAfterTheWalk).toBe(0);
    expect(cut(before).flatMap((w) => w.requests.map((r) => r.outcome))).toEqual(
      Array(36).fill("200"),
    );
    expect(before.summary["hosted · 300 ms"].ranOnAfterTheWalk).toBe(36);
  });

  it("publish the numbers the README gives", () => {
    const hostedNow = now.summary["hosted · 4000 ms"];
    expect(hostedNow.ms).toEqual({ p50: 377, p95: 2617, max: 2690 });
    expect(hostedNow.stopped).toEqual({ "the line was added": 33, "no patch": 3 });
    expect(hostedNow.requests.byWalk).toEqual({ "1": 24, "3": 6, "5": 6 });
    expect(hostedNow.firstRequestMs).toEqual({ p50: 363, shareOfWalk: 0.39 });
    expect(hostedNow.longerThanTheAnswer.walks).toEqual([
      "tslint-189#0",
      "tslint-189#1",
      "tslint-189#2",
    ]);
    expect(now.summary["seeded · 4000 ms"].ms).toEqual({ p50: 69, p95: 145, max: 170 });
  });
});
