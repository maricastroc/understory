import { describe, expect, it } from "vitest";
import { clusterByCommit, selectBlameTargets } from "./plan";
import type { BlamedTarget, FileChange, LineRange } from "./types";

function fc(p: Partial<FileChange> & { oldPath: string | null }): FileChange {
  return {
    newPath: p.oldPath,
    status: "modified",
    removedRanges: [],
    addedRanges: [],
    binary: false,
    ...p,
  };
}

const r = (start: number, end: number): LineRange => ({ start, end });

describe("selectBlameTargets — triage", () => {
  it("emits a blame target for removed code in a modified file", () => {
    const res = selectBlameTargets([fc({ oldPath: "a.ts", removedRanges: [r(6, 6)] })]);
    expect(res.targets).toEqual([{ path: "a.ts", range: { start: 6, end: 6 } }]);
    expect(res.filesConsidered).toBe(1);
    expect(res.truncated).toBe(false);
  });

  it("skips added-only and binary files (no old-side history)", () => {
    const res = selectBlameTargets([
      fc({ oldPath: null, status: "added", addedRanges: [r(1, 3)] }),
      fc({ oldPath: "img.png", binary: true }),
      fc({ oldPath: "keep.ts", removedRanges: [r(2, 2)] }),
    ]);
    expect(res.targets).toEqual([{ path: "keep.ts", range: { start: 2, end: 2 } }]);
    expect(res.filesSkipped).toBe(2);
  });

  it("includes deleted files — a reviewer wants to know why removed code existed", () => {
    const res = selectBlameTargets([
      fc({ oldPath: "gone.ts", newPath: null, status: "deleted", removedRanges: [r(1, 4)] }),
    ]);
    expect(res.targets).toEqual([{ path: "gone.ts", range: { start: 1, end: 4 } }]);
  });

  it("merges near ranges into one blame call but keeps distant ones apart", () => {
    const files = [fc({ oldPath: "a.ts", removedRanges: [r(1, 2), r(4, 5), r(40, 41)] })];
    const res = selectBlameTargets(files, { mergeGap: 3 });
    expect(res.targets).toEqual([
      { path: "a.ts", range: { start: 1, end: 5 } },
      { path: "a.ts", range: { start: 40, end: 41 } },
    ]);
  });

  it("caps at the target budget and reports truncation", () => {
    const files = Array.from({ length: 10 }, (_, i) => fc({ oldPath: `f${i}.ts`, removedRanges: [r(1, 1)] }));
    const res = selectBlameTargets(files, { maxTargets: 4 });
    expect(res.targets).toHaveLength(4);
    expect(res.truncated).toBe(true);
  });

  it("caps ranges per file", () => {
    const many = Array.from({ length: 20 }, (_, i) => r(i * 10 + 1, i * 10 + 1));
    const res = selectBlameTargets([fc({ oldPath: "big.ts", removedRanges: many })], { maxPerFile: 5 });
    expect(res.targets).toHaveLength(5);
    expect(res.truncated).toBe(true);
  });
});

describe("clusterByCommit — dedup by origin commit", () => {
  it("groups ranges that share a commit and preserves first-seen order", () => {
    const blamed: BlamedTarget[] = [
      { target: { path: "a.ts", range: r(6, 6) }, commitId: "commit:c1" },
      { target: { path: "b.ts", range: r(2, 2) }, commitId: "commit:c2" },
      { target: { path: "a.ts", range: r(9, 9) }, commitId: "commit:c1" },
    ];
    const clusters = clusterByCommit(blamed);
    expect(clusters).toEqual([
      { commitId: "commit:c1", targets: [{ path: "a.ts", range: r(6, 6) }, { path: "a.ts", range: r(9, 9) }] },
      { commitId: "commit:c2", targets: [{ path: "b.ts", range: r(2, 2) }] },
    ]);
  });

  it("dedupes identical (path,range) pairs within a commit", () => {
    const blamed: BlamedTarget[] = [
      { target: { path: "a.ts", range: r(6, 6) }, commitId: "commit:c1" },
      { target: { path: "a.ts", range: r(6, 6) }, commitId: "commit:c1" },
    ];
    expect(clusterByCommit(blamed)[0].targets).toHaveLength(1);
  });

  it("is empty for no blame results", () => {
    expect(clusterByCommit([])).toEqual([]);
  });
});
