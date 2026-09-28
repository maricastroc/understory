import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithTokens } from "../token-context";
import { type AssociatedPr, attachEnrichment, enrichCommits, spansFromGitHubRanges } from "./blame";

const lean = (oid: string, date = "2024-01-01T00:00:00Z") => ({
  oid,
  abbreviatedOid: oid.slice(0, 7),
  messageHeadline: `commit ${oid}`,
  message: `commit ${oid}`,
  committedDate: date,
  url: `https://gh/x/commit/${oid}`,
  author: { name: "Ana", email: null },
});

const pr = (number: number): AssociatedPr => ({
  number,
  title: `pr ${number}`,
  body: "",
  url: `https://gh/x/pull/${number}`,
  createdAt: "2024-01-01T00:00:00Z",
  reviews: { nodes: [] },
  closingIssuesReferences: { nodes: [] },
});

describe("attachEnrichment — PR lookup status", () => {
  const a = lean("a".repeat(40));
  const b = lean("b".repeat(40));
  const c = lean("c".repeat(40));

  it("separates found, none and never-searched commits", () => {
    const out = attachEnrichment(
      [a, b, c],
      new Set([a.oid, b.oid]),
      new Map([
        [a.oid, [pr(1)]],
        [b.oid, []],
      ]),
    );
    expect(out.map((x) => x.prLookup)).toEqual(["found", "none", "skipped"]);
    expect(out[0].associatedPullRequests.nodes.map((p) => p.number)).toEqual([1]);
  });

  it("marks every searched commit as failed when the lookup itself failed", () => {
    const out = attachEnrichment([a, b], new Set([a.oid, b.oid]), null);
    expect(out.map((x) => x.prLookup)).toEqual(["failed", "failed"]);
    expect(out.every((x) => x.associatedPullRequests.nodes.length === 0)).toBe(true);
  });

  it("marks a commit the provider could not resolve as failed, not none", () => {
    const out = attachEnrichment([a], new Set([a.oid]), new Map([[a.oid, null]]));
    expect(out[0].prLookup).toBe("failed");
  });
});

describe("enrichCommits", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null for commits GitHub cannot resolve and [] for commits without PRs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            repository: {
              c0: { associatedPullRequests: { nodes: [] } },
              c1: null,
            },
          },
        }),
      })),
    );
    const out = await runWithTokens({ github: "t" }, () => enrichCommits("o", "r", ["x1", "x2"]));
    expect(out.get("x1")).toEqual([]);
    expect(out.get("x2")).toBeNull();
  });
});

describe("spansFromGitHubRanges", () => {
  const range = (startingLine: number, endingLine: number, oid: string) => ({
    startingLine,
    endingLine,
    commit: {
      oid,
      abbreviatedOid: oid.slice(0, 7),
      committedDate: "2023-03-15T00:00:00Z",
      author: { name: "Priya", email: null },
    },
  });

  it("clips ranges to the window and sorts them by line", () => {
    const spans = spansFromGitHubRanges(
      [range(10, 30, "b".repeat(40)), range(1, 9, "a".repeat(40)), range(31, 50, "c".repeat(40))],
      5,
      12,
    );
    expect(spans).toEqual([
      {
        startLine: 5,
        endLine: 9,
        sha: "a".repeat(40),
        shortSha: "aaaaaaa",
        date: "2023-03-15T00:00:00Z",
        author: "Priya",
      },
      {
        startLine: 10,
        endLine: 12,
        sha: "b".repeat(40),
        shortSha: "bbbbbbb",
        date: "2023-03-15T00:00:00Z",
        author: "Priya",
      },
    ]);
  });

  it("omits the author when the provider has none", () => {
    const [span] = spansFromGitHubRanges(
      [
        {
          ...range(1, 1, "a".repeat(40)),
          commit: { ...range(1, 1, "a".repeat(40)).commit, author: null },
        },
      ],
      1,
      1,
    );
    expect(span).not.toHaveProperty("author");
  });
});
