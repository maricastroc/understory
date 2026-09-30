import { describe, expect, it } from "vitest";
import type { Artifact, ArtifactKind } from "@understory/core/types";
import { buildCausalChain } from "./causal-chain";

function mk(kind: ArtifactKind, id: string, date: string, parentId?: string): Artifact {
  return { id, kind, title: `${kind} ${id}`, body: "", url: `https://x/${id}`, date, parentId };
}

describe("buildCausalChain", () => {
  it("is empty with no artifacts", () => {
    expect(buildCausalChain([])).toEqual({ mode: "empty" });
  });

  it("falls back to commits-only when nothing upstream exists, newest first", () => {
    const chain = buildCausalChain([
      mk("commit", "commit:a", "2023-01-01"),
      mk("commit", "commit:b", "2023-02-01"),
    ]);
    expect(chain.mode).toBe("commits-only");
    if (chain.mode !== "commits-only") throw new Error("mode");
    expect(chain.commits.map((c) => c.id)).toEqual(["commit:b", "commit:a"]);
  });

  it("groups by role for legacy data that has upstream artifacts but no edges", () => {
    const chain = buildCausalChain([
      mk("commit", "commit:a", "2023-01-03"),
      mk("pull_request", "pr:1", "2023-01-02"),
      mk("issue", "issue:1", "2023-01-01"),
    ]);
    expect(chain.mode).toBe("grouped");
    if (chain.mode !== "grouped") throw new Error("mode");
    expect(chain.groups.map((g) => g.kind)).toEqual(["issue", "pull_request", "commit"]);
  });

  it("builds a complete lane with zero gaps", () => {
    const chain = buildCausalChain([
      mk("issue", "issue:1", "2023-01-01", "pr:1"),
      mk("pull_request", "pr:1", "2023-01-02", "commit:a"),
      mk("review", "review:1-0", "2023-01-03", "pr:1"),
      mk("commit", "commit:a", "2023-01-04"),
    ]);
    expect(chain.mode).toBe("lanes");
    if (chain.mode !== "lanes") throw new Error("mode");
    expect(chain.gaps).toBe(0);
    const [lane] = chain.lanes;
    expect(lane.issue.artifact?.id).toBe("issue:1");
    expect(lane.pr.artifact?.id).toBe("pr:1");
    expect(lane.review.artifact?.id).toBe("review:1-0");
  });

  it("counts a missing review as one gap and leaves the slot empty", () => {
    const chain = buildCausalChain([
      mk("issue", "issue:1", "2023-01-01", "pr:1"),
      mk("pull_request", "pr:1", "2023-01-02", "commit:a"),
      mk("commit", "commit:a", "2023-01-04"),
    ]);
    if (chain.mode !== "lanes") throw new Error("mode");
    expect(chain.gaps).toBe(1);
    expect(chain.lanes[0].review.artifact).toBeNull();
  });

  it("treats a PR-less commit as a single gap, not three", () => {
    const chain = buildCausalChain([
      mk("pull_request", "pr:1", "2023-01-02", "commit:a"),
      mk("commit", "commit:a", "2023-01-01"),
      mk("commit", "commit:b", "2023-02-01"),
    ]);
    if (chain.mode !== "lanes") throw new Error("mode");

    expect(chain.gaps).toBe(3);
    const direct = chain.lanes.find((l) => l.commit.id === "commit:b");
    expect(direct?.pr.artifact).toBeNull();
  });

  it("orders lanes newest commit first and reports extra siblings", () => {
    const chain = buildCausalChain([
      mk("issue", "issue:1", "2023-01-01", "pr:1"),
      mk("issue", "issue:2", "2023-01-01", "pr:1"),
      mk("pull_request", "pr:1", "2023-01-02", "commit:a"),
      mk("commit", "commit:a", "2023-01-04"),
      mk("commit", "commit:z", "2023-06-01"),
    ]);
    if (chain.mode !== "lanes") throw new Error("mode");
    expect(chain.lanes[0].commit.id).toBe("commit:z");
    const withIssues = chain.lanes.find((l) => l.commit.id === "commit:a");
    expect(withIssues?.issue.extra).toBe(1);
  });
});
