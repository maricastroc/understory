import { describe, expect, it } from "vitest";
import type { BlameCommit } from "./blame";
import { expandCommit } from "./enrich";

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

const pr = (number: number, issueNo: number) => ({
  number,
  title: `pr ${number}`,
  body: "",
  url: `https://gh/x/pull/${number}`,
  createdAt: "2024-01-01T00:00:00Z",
  reviews: {
    nodes: [
      {
        author: { login: "bob" },
        state: "COMMENTED",
        body: "why?",
        submittedAt: "2024-01-02T00:00:00Z",
      },
      {
        author: { login: "eve" },
        state: "COMMENTED",
        body: "   ",
        submittedAt: "2024-01-02T00:00:00Z",
      },
    ],
  },
  closingIssuesReferences: {
    nodes: [
      {
        number: issueNo,
        title: "iss",
        body: "",
        url: `https://gh/x/issues/${issueNo}`,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
  },
});

describe("expandCommit", () => {
  it("is just the commit when nothing is associated", () => {
    expect(expandCommit(bc()).map((a) => a.id)).toEqual(["commit:abc123"]);
  });

  it("expands commit → PR → issues → non-empty reviews, dropping blank reviews", () => {
    const commit = bc({ associatedPullRequests: { nodes: [pr(42, 7)] } });
    expect(expandCommit(commit).map((a) => a.id)).toEqual([
      "commit:abc123",
      "pr:42",
      "issue:7",
      "review:42-0",
    ]);
  });

  it("does NOT dedupe — that is the caller's job (line collector vs per-cluster)", () => {
    const commit = bc({ associatedPullRequests: { nodes: [pr(42, 7), pr(43, 7)] } });
    const ids = expandCommit(commit).map((a) => a.id);
    expect(ids.filter((id) => id === "issue:7")).toHaveLength(2);
  });
});

const threaded = () =>
  bc({
    associatedPullRequests: {
      nodes: [
        {
          number: 42,
          title: "add retry cap",
          body: "caps retries",
          url: "https://gh/x/pull/42",
          createdAt: "2024-01-01T00:00:00Z",
          comments: {
            nodes: [
              { author: { login: "lee" }, body: "does this cover webhooks?", createdAt: "x" },
            ],
          },
          reviews: {
            nodes: [
              {
                author: { login: "eve" },
                state: "COMMENTED",
                body: "",
                submittedAt: "2024-01-02T00:00:00Z",
                comments: {
                  nodes: [
                    {
                      author: { login: "eve" },
                      body: "why exactly 3 and not configurable?",
                      createdAt: "x",
                    },
                  ],
                },
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
                comments: {
                  nodes: [
                    {
                      author: { login: "ana" },
                      body: "seen in prod during the outage",
                      createdAt: "x",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  });

describe("expandCommit — folds discussion into bodies", () => {
  it("keeps an empty-body review that argued the point in an inline thread", () => {
    const review = expandCommit(threaded()).find((a) => a.id === "review:42-0");
    expect(review).toBeDefined();
    expect(review!.body).toContain("why exactly 3 and not configurable?");
  });

  it("folds the PR conversation and issue comments into their bodies", () => {
    const arts = expandCommit(threaded());
    const pr = arts.find((a) => a.id === "pr:42")!;
    const issue = arts.find((a) => a.id === "issue:7")!;
    expect(pr.body).toContain("— discussion —");
    expect(pr.body).toContain("does this cover webhooks?");
    expect(issue.body).toContain("seen in prod during the outage");
  });
});
