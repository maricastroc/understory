import { describe, expect, it } from "vitest";
import type { BlameCommit } from "../collect/github";
import type { Contradiction } from "../types";
import { buildClusters, rankAndBudget } from "./collect";
import type { BlamedTarget, DiffCluster, LineRange } from "./types";

const range = (start: number, end: number): LineRange => ({ start, end });
const target = (path: string, r: LineRange) => ({ path, range: r });

function bc(over: Partial<BlameCommit> = {}): BlameCommit {
  return {
    oid: "abc123full0000",
    abbreviatedOid: "abc123",
    messageHeadline: "cap retries",
    message: "cap retries\n\nbecause the gateway rate-limits",
    committedDate: "2024-01-01T00:00:00Z",
    url: "https://gh/x/commit/abc123",
    author: { name: "Ana", email: "a@b.c" },
    associatedPullRequests: { nodes: [] },
    ...over,
  };
}

const richPr = {
  number: 42,
  title: "add retry cap",
  body: "caps retries at 3",
  url: "https://gh/x/pull/42",
  createdAt: "2024-01-01T00:00:00Z",
  reviews: {
    nodes: [
      {
        author: { login: "bob" },
        state: "CHANGES_REQUESTED",
        body: "why exactly 3?",
        submittedAt: "2024-01-02T00:00:00Z",
      },
      {
        author: { login: "eve" },
        state: "COMMENTED",
        body: "",
        submittedAt: "2024-01-02T00:00:00Z",
      },
    ],
  },
  closingIssuesReferences: {
    nodes: [
      {
        number: 7,
        title: "retry storm",
        body: "double billing",
        url: "https://gh/x/issues/7",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
  },
};

describe("buildClusters", () => {
  it("groups targets by origin commit and builds the commit artifact", () => {
    const blamed: BlamedTarget[] = [
      { target: target("a.ts", range(6, 6)), commitId: "commit:abc123" },
      { target: target("a.ts", range(20, 22)), commitId: "commit:abc123" },
    ];
    const clusters = buildClusters(blamed, new Map([["commit:abc123", bc()]]));
    expect(clusters).toHaveLength(1);
    expect(clusters[0].commitId).toBe("commit:abc123");
    expect(clusters[0].targets).toHaveLength(2);
    expect(clusters[0].artifacts.map((a) => a.id)).toEqual(["commit:abc123"]);
  });

  it("enriches with the PR, its issues and its non-empty reviews", () => {
    const commit = bc({ associatedPullRequests: { nodes: [richPr] } });
    const blamed: BlamedTarget[] = [
      { target: target("a.ts", range(6, 6)), commitId: "commit:abc123" },
    ];
    const clusters = buildClusters(blamed, new Map([["commit:abc123", commit]]));
    expect(clusters[0].artifacts.map((a) => a.id)).toEqual([
      "commit:abc123",
      "pr:42",
      "issue:7",
      "review:42-0",
    ]);
  });

  it("tolerates a blamed commit that is missing from the map", () => {
    const blamed: BlamedTarget[] = [
      { target: target("a.ts", range(1, 1)), commitId: "commit:ghost" },
    ];
    const clusters = buildClusters(blamed, new Map());
    expect(clusters[0].artifacts).toEqual([]);
  });
});

describe("rankAndBudget", () => {
  const contra: Contradiction = { artifactId: "commit:x", kind: "revert", detail: "reverted" };
  const cl = (over: Partial<DiffCluster>): DiffCluster => ({
    commitId: "c",
    targets: [target("a.ts", range(1, 1))],
    artifacts: [],
    contradictions: [],
    rank: 0,
    ...over,
  });

  it("ranks contradicted changes above quiet ones", () => {
    const quiet = cl({ commitId: "quiet" });
    const risky = cl({ commitId: "risky", contradictions: [contra] });
    const { kept } = rankAndBudget([quiet, risky]);
    expect(kept[0].commitId).toBe("risky");
  });

  it("ranks a reviewed change above a bare-commit change", () => {
    const bare = cl({ commitId: "bare" });
    const reviewed = cl({
      commitId: "reviewed",
      artifacts: [
        { id: "review:1-0", kind: "review", title: "r", body: "b", url: "", date: "2024-01-01" },
      ],
    });
    const { kept } = rankAndBudget([bare, reviewed]);
    expect(kept[0].commitId).toBe("reviewed");
  });

  it("keeps only the top budget and reports the rest dropped", () => {
    const many = Array.from({ length: 5 }, (_, i) => cl({ commitId: `c${i}` }));
    const { kept, droppedCount } = rankAndBudget(many, 2);
    expect(kept).toHaveLength(2);
    expect(droppedCount).toBe(3);
  });

  it("breaks rank ties by commitId, so the budget cut is deterministic", () => {
    const ids = ["c", "a", "e", "b", "d"];
    const forward = rankAndBudget(
      ids.map((id) => cl({ commitId: id })),
      2,
    );
    const reversed = rankAndBudget(
      [...ids].reverse().map((id) => cl({ commitId: id })),
      2,
    );
    expect(forward.kept.map((k) => k.commitId)).toEqual(["a", "b"]);
    expect(reversed.kept.map((k) => k.commitId)).toEqual(forward.kept.map((k) => k.commitId));
  });
});
