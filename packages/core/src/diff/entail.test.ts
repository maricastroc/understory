import { describe, expect, it } from "vitest";
import type { Artifact } from "../types";
import { diffEntailmentAffordable } from "./entail";
import type { DiffCluster } from "./types";

const artifact = (id: string): Artifact =>
  ({ id, kind: "commit", date: "2026-01-01", body: "x" }) as unknown as Artifact;

const cluster = (n: number): DiffCluster =>
  ({
    targets: [],
    artifacts: Array.from({ length: n }, (_, i) => artifact(`a${i}`)),
  }) as unknown as DiffCluster;

describe("diffEntailmentAffordable", () => {
  it("allows a small pull request", () => {
    expect(diffEntailmentAffordable([cluster(2), cluster(2)])).toBe(true);
  });

  it("skips when there are too many clusters", () => {
    expect(diffEntailmentAffordable(Array.from({ length: 8 }, () => cluster(1)))).toBe(false);
  });

  it("skips when the total artifact count is too high", () => {
    expect(diffEntailmentAffordable([cluster(7), cluster(7)])).toBe(false);
  });
});
