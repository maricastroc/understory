import { describe, expect, it } from "vitest";
import { auditSubject } from "../entail";
import { buildSynthesisInput } from "../synthesize";
import type { Artifact, Evidence } from "../types";
import { changedRun } from "./code-context";

const commit: Artifact = {
  id: "commit:ccc3333",
  kind: "commit",
  title: "sync: drop zero-quantity rows only for discontinued SKUs",
  body: "Brings back the saving without hiding sell-outs.",
  url: "",
  date: "2024-03-18T00:00:00Z",
  meta: { sha: "ccc3333" },
};
const pull: Artifact = { ...commit, id: "pr:7", kind: "pull_request", parentId: commit.id };
const review: Artifact = {
  ...commit,
  id: "review:7-0",
  kind: "review",
  parentId: pull.id,
  body: "@ana: skip them only when discontinued",
};

const evidence = (withNewFields: boolean): Evidence => ({
  question: "Why is this line the way it is?",
  repo: { path: "." },
  location: { file: "src/dedupe.ts", startLine: 4, endLine: 4 },
  contradictions: [],
  coverage: { granularity: "line" },
  artifacts: [
    commit,
    pull,
    withNewFields
      ? {
          ...review,
          comments: [
            {
              body: "skip them only when discontinued",
              path: "src/other.ts",
              diffHunk: "@@ -1 +1 @@\n+x",
              outdated: true,
              line: null,
            },
          ],
        }
      : review,
  ],
  code: {
    startLine: 3,
    lines: ["export function keep(row) {", "  return row.quantity > 0;", "}"],
    change: {
      artifactId: commit.id,
      before: "return true;",
      added: 1,
      ...(withNewFields ? { scope: { files: 1, lines: 2, block: 2 } } : {}),
    },
  },
});

describe("the scope of a change and the place of a comment are data only", () => {
  it("leave what the writer is shown unchanged, to the character", () => {
    expect(buildSynthesisInput(evidence(true))).toEqual(buildSynthesisInput(evidence(false)));
  });

  it("leave what the audit is told unchanged, to the character", () => {
    expect(auditSubject(evidence(true))).toEqual(auditSubject(evidence(false)));
  });
});

describe("changedRun — how many rows the change made around the line", () => {
  const patch = [
    "@@ -1,3 +1,4 @@",
    " keep();",
    "-old();",
    "+first();",
    "+second();",
    " keep();",
  ].join("\n");

  it("counts the added and removed rows the line sits among", () => {
    expect(changedRun(patch, "second();")).toBe(3);
  });

  it("says nothing when the line is not in the patch exactly once", () => {
    expect(changedRun(patch, "missing();")).toBeNull();
    expect(changedRun("@@ -1,0 +1,2 @@\n+a();\n+a();", "a();")).toBeNull();
    expect(changedRun(patch, "  ")).toBeNull();
  });
});
