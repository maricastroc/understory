import { describe, expect, it } from "vitest";
import { traceProvenance } from "./provenance";
import type { Artifact, Evidence } from "./types";

const commit = (sha: string, date: string): Artifact => ({
  id: `commit:${sha}`,
  kind: "commit",
  title: sha,
  body: sha,
  url: "",
  date,
  ref: sha,
});

const pr = (n: number, parentId: string, date: string): Artifact => ({
  id: `pr:${n}`,
  kind: "pull_request",
  title: `PR ${n}`,
  body: "",
  url: "",
  date,
  ref: `#${n}`,
  parentId,
});

const ev = (artifacts: Artifact[], located = true): Evidence => ({
  question: "why?",
  repo: { path: "o/r" },
  ...(located ? { location: { file: "f.ts", startLine: 1, endLine: 1 } } : {}),
  artifacts,
  contradictions: [],
});

describe("traceProvenance", () => {
  it("returns the latest-dated commit as the line owner", () => {
    const old = commit("aaa", "2023-01-01T00:00:00Z");
    const recent = commit("bbb", "2023-06-01T00:00:00Z");

    expect(traceProvenance(ev([recent, old]))).toEqual({ commit: "commit:bbb" });
  });

  it("attaches the PR that the owning commit came through", () => {
    const owner = commit("bbb", "2023-06-01T00:00:00Z");
    const p = pr(42, "commit:bbb", "2023-06-01T00:00:00Z");
    expect(traceProvenance(ev([owner, p]))).toEqual({ commit: "commit:bbb", pr: "pr:42" });
  });

  it("ignores a PR that hangs off an earlier commit, not the owner", () => {
    const old = commit("aaa", "2023-01-01T00:00:00Z");
    const owner = commit("bbb", "2023-06-01T00:00:00Z");
    const stalePr = pr(7, "commit:aaa", "2023-01-01T00:00:00Z");
    expect(traceProvenance(ev([old, owner, stalePr]))).toEqual({ commit: "commit:bbb" });
  });

  it("returns null for an anchored drill-down (no line to blame)", () => {
    expect(traceProvenance(ev([commit("aaa", "2023-01-01T00:00:00Z")], false))).toBeNull();
  });

  it("returns null when no commit shaped the line", () => {
    expect(traceProvenance(ev([]))).toBeNull();
    const issue: Artifact = {
      id: "issue:1",
      kind: "issue",
      title: "i",
      body: "",
      url: "",
      date: "2023-01-01T00:00:00Z",
    };
    expect(traceProvenance(ev([issue]))).toBeNull();
  });
});
