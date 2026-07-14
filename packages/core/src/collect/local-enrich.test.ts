import { describe, expect, it } from "vitest";
import type { RepoRef } from "../types";
import type { GitCommit } from "./git";
import type { AssociatedPr } from "./github";
import { buildLocalArtifacts } from "./local-enrich";

const repo: RepoRef = {
  path: "/x",
  name: "o/r",
  remoteUrl: "https://github.com/o/r",
  branch: "main",
};

const commit = (sha: string, subject: string, date: string): GitCommit => ({
  sha,
  shortSha: sha.slice(0, 7),
  author: { name: "Dev" },
  date,
  subject,
  body: "",
});

const pr: AssociatedPr = {
  number: 42,
  title: "bound retries",
  body: "cap at 3 after the outage",
  url: "https://github.com/o/r/pull/42",
  createdAt: "2023-02-10T00:00:00Z",
  comments: {
    nodes: [{ author: { login: "reviewer" }, body: "why 3 and not 5?", createdAt: "2023-02-11T00:00:00Z" }],
  },
  reviews: {
    nodes: [
      {
        author: { login: "reviewer" },
        state: "APPROVED",
        body: "the 10s webhook window is the reason",
        submittedAt: "2023-02-12T00:00:00Z",
        comments: { nodes: [] },
      },
    ],
  },
  closingIssuesReferences: {
    nodes: [
      {
        number: 7,
        title: "double billing",
        body: "outage resubmitted charges",
        url: "https://github.com/o/r/issues/7",
        createdAt: "2023-01-01T00:00:00Z",
        comments: { nodes: [] },
      },
    ],
  },
};

describe("buildLocalArtifacts", () => {
  it("expands an enriched commit into the full commit → PR → issue → review trail", () => {
    const commits = [
      commit("aaaaaaa0000", "introduce retry", "2023-01-15T00:00:00Z"),
      commit("bbbbbbb1111", "bound retries", "2023-02-10T00:00:00Z"),
    ];
    const arts = buildLocalArtifacts(commits, repo, new Map([["bbbbbbb1111", [pr]]]));
    const ids = arts.map((a) => a.id);

    // both commits present, plus the PR trail hung off the enriched one
    expect(ids).toContain("commit:aaaaaaa");
    expect(ids).toContain("commit:bbbbbbb");
    expect(ids).toContain("pr:42");
    expect(ids).toContain("issue:7");
    expect(ids).toContain("review:42-0");

    // the PR conversation is folded into the body so grounding can quote the discussion
    expect(arts.find((a) => a.id === "pr:42")?.body).toContain("why 3 and not 5?");

    // the commit URL points at the remote so it is clickable, not a bare local sha
    expect(arts.find((a) => a.id === "commit:bbbbbbb")?.url).toBe(
      "https://github.com/o/r/commit/bbbbbbb1111",
    );

    const dates = arts.map((a) => a.date);
    expect(dates).toEqual([...dates].sort((a, b) => a.localeCompare(b)));
  });

  it("collapses to commits only when the enrichment map is empty (offline / no token)", () => {
    const commits = [commit("aaaaaaa0000", "introduce retry", "2023-01-15T00:00:00Z")];
    const arts = buildLocalArtifacts(commits, repo, new Map());
    expect(arts.map((a) => a.id)).toEqual(["commit:aaaaaaa"]);
    expect(arts.every((a) => a.kind === "commit")).toBe(true);
  });
});
