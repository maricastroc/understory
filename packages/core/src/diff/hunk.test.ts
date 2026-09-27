import { describe, expect, it } from "vitest";
import { hunkFor, MAX_HUNK_LINES } from "./hunk";
import { parseUnifiedDiff } from "./parse";
import { clusterByCommit, selectBlameTargets } from "./plan";

const DIFF = [
  "diff --git a/webhooks/router.ts b/webhooks/router.ts",
  "--- a/webhooks/router.ts",
  "+++ b/webhooks/router.ts",
  "@@ -14,5 +14,3 @@",
  '-if (req.headers["stripe-version"] < V2) {',
  "-  return handleLegacy(evt);",
  "-}",
  "+assertV2(req.headers);",
  "+return handleV2(evt);",
  " const a = 1;",
  " const b = 2;",
  "@@ -60,3 +58,0 @@",
  "-} catch (err) {",
  "-  if (FLAGS.STRIPE_V2_ONLY) throw err;",
  "-  return handleLegacy(evt);",
  "",
].join("\n");

describe("hunks on blame targets", () => {
  const file = parseUnifiedDiff(DIFF).files[0];

  it("records removed and added lines with their line numbers, grouped in change blocks", () => {
    expect(file.changes?.slice(0, 5)).toMatchObject([
      { kind: "del", old: 14, new: null, text: 'if (req.headers["stripe-version"] < V2) {' },
      { kind: "del", old: 15 },
      { kind: "del", old: 16 },
      { kind: "add", old: null, new: 14, text: "assertV2(req.headers);" },
      { kind: "add", new: 15 },
    ]);
    const blocks = new Set(file.changes?.map((c) => c.block));
    expect(blocks.size).toBe(2);
  });

  it("builds a target's hunk from the change blocks that touch its old-side range", () => {
    const hunk = hunkFor(file.changes!, { start: 14, end: 16 });
    expect(hunk).toMatchObject({ removed: 3, added: 2, omitted: 0 });
    expect(hunk?.lines.map((l) => l.kind)).toEqual(["del", "del", "del", "add", "add"]);
    expect(hunkFor(file.changes!, { start: 30, end: 40 })).toBeUndefined();
  });

  it("caps long hunks and says how many lines were left out", () => {
    const big = Array.from({ length: MAX_HUNK_LINES + 7 }, (_, i) => ({
      kind: "del" as const,
      old: i + 1,
      new: null,
      text: `line ${i + 1}`,
      block: 0,
    }));
    const hunk = hunkFor(big, { start: 1, end: big.length });
    expect(hunk?.lines).toHaveLength(MAX_HUNK_LINES);
    expect(hunk).toMatchObject({ removed: big.length, omitted: 7 });
  });

  it("attaches hunks to targets without changing how targets cluster", () => {
    const { targets } = selectBlameTargets([file]);
    expect(targets.map((t) => [t.range.start, t.range.end, t.hunk?.removed])).toEqual([
      [14, 16, 3],
      [60, 62, 3],
    ]);
    const clusters = clusterByCommit(
      targets.map((target) => ({ target, commitId: "commit:e4c19aa" })),
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].targets).toHaveLength(2);
  });
});
