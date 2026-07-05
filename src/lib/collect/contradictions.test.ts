import { describe, expect, it } from "vitest";
import type { Artifact } from "../types";
import { detectContradictions } from "./contradictions";

function commit(id: string, title: string, body = "", sha?: string): Artifact {
  return {
    id: `commit:${id}`,
    kind: "commit",
    title,
    body: body || title,
    url: "",
    date: "2024-05-12T00:00:00Z",
    ref: id,
    meta: sha ? { sha } : undefined,
  };
}

function issue(num: number, state: string, stateReason?: string): Artifact {
  return {
    id: `issue:${num}`,
    kind: "issue",
    title: `Issue ${num}`,
    body: "",
    url: "",
    date: "2024-01-01T00:00:00Z",
    ref: `#${num}`,
    meta: { state, ...(stateReason ? { stateReason } : {}) },
  };
}

describe("detectContradictions", () => {
  it("flags a commit reverted by another commit via the reverts-sha trailer", () => {
    const original = commit("a1b2c3d", "Add rate-limit guard", "", "a1b2c3d4e5f6");
    const revert = commit(
      "9f9f9f9",
      'Revert "Add rate-limit guard"',
      "This reverts commit a1b2c3d4e5f6.",
    );
    const found = detectContradictions([original, revert]);
    expect(found).toEqual([
      {
        artifactId: "commit:a1b2c3d",
        by: "commit:9f9f9f9",
        kind: "revert",
        detail: "Reverted by 9f9f9f9 on 12 May 2024 — the change was later undone.",
      },
    ]);
  });

  it("matches a revert by quoted headline when the sha trailer is absent", () => {
    const original = commit("aaaaaaa", "Cache the token lookup");
    const revert = commit("bbbbbbb", 'Revert "Cache the token lookup"');
    const found = detectContradictions([original, revert]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ artifactId: "commit:aaaaaaa", kind: "revert" });
  });

  it("does not flag a revert whose target was not collected", () => {
    const revert = commit("bbbbbbb", 'Revert "Something not in our evidence"');
    expect(detectContradictions([revert])).toEqual([]);
  });

  it("flags a reopened issue", () => {
    const found = detectContradictions([issue(42, "OPEN")]);
    expect(found).toEqual([
      {
        artifactId: "issue:42",
        kind: "reopened",
        detail: "#42 is open again — reopened after the change that was meant to close it.",
      },
    ]);
  });

  it("flags an issue closed as not planned", () => {
    const found = detectContradictions([issue(7, "CLOSED", "NOT_PLANNED")]);
    expect(found[0]).toMatchObject({ artifactId: "issue:7", kind: "declined" });
  });

  it("does not flag a normally closed (completed) issue", () => {
    expect(detectContradictions([issue(7, "CLOSED", "COMPLETED")])).toEqual([]);
  });

  it("returns nothing for a clean, uncontested history", () => {
    const a = commit("aaaaaaa", "Add validation");
    const b = commit("bbbbbbb", "Tidy imports");
    expect(detectContradictions([a, b, issue(1, "CLOSED", "COMPLETED")])).toEqual([]);
  });

  it("dedupes a target reverted more than once", () => {
    const original = commit("aaaaaaa", "Add flag", "", "aaaaaaadeadbeef");
    const r1 = commit("bbbbbbb", 'Revert "Add flag"', "This reverts commit aaaaaaadeadbeef.");
    const r2 = commit("ccccccc", 'Revert "Add flag"');
    const found = detectContradictions([original, r1, r2]);
    expect(found.filter((c) => c.artifactId === "commit:aaaaaaa")).toHaveLength(1);
  });
});
