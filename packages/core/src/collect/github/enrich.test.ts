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

describe("expandCommit — lookup and review metadata", () => {
  it("records the PR lookup status on the commit only when it is known", () => {
    expect(expandCommit(bc())[0].meta).not.toHaveProperty("prLookup");
    expect(expandCommit(bc({ prLookup: "none" }))[0].meta).toMatchObject({ prLookup: "none" });
  });

  it("records merge date, review and issue lookups on the PR, and state on the review", () => {
    const withPr = bc({
      prLookup: "found",
      associatedPullRequests: { nodes: [{ ...pr(42, 7), mergedAt: "2024-01-05T00:00:00Z" }] },
    });
    const arts = expandCommit(withPr);
    expect(arts.find((a) => a.id === "pr:42")?.meta).toEqual({
      mergedAt: "2024-01-05T00:00:00Z",
      reviewLookup: "found",
      issueLookup: "found",
    });
    expect(arts.find((a) => a.id === "review:42-0")?.meta).toEqual({ state: "COMMENTED" });
  });

  it("reports a PR with no reviews and no closing issue as searched-and-empty", () => {
    const bare = {
      ...pr(43, 0),
      reviews: { nodes: [] },
      closingIssuesReferences: { nodes: [] },
    };
    const arts = expandCommit(bc({ associatedPullRequests: { nodes: [bare] } }));
    expect(arts.find((a) => a.id === "pr:43")?.meta).toEqual({
      reviewLookup: "none",
      issueLookup: "none",
    });
  });

  it("keeps a textless review as found even though it produces no artifact", () => {
    const silent = {
      ...pr(44, 0),
      reviews: {
        nodes: [
          {
            author: { login: "eve" },
            state: "APPROVED",
            body: " ",
            submittedAt: "2024-01-02T00:00:00Z",
          },
        ],
      },
      closingIssuesReferences: { nodes: [] },
    };
    const arts = expandCommit(bc({ associatedPullRequests: { nodes: [silent] } }));
    expect(arts.some((a) => a.kind === "review")).toBe(false);
    expect(arts.find((a) => a.id === "pr:44")?.meta).toMatchObject({ reviewLookup: "found" });
  });
});

describe("expandCommit — bots are not evidence", () => {
  const bot = (login: string, body: string) => ({
    author: { __typename: "Bot", login },
    state: "COMMENTED",
    body,
    submittedAt: "2024-01-02T00:00:00Z",
  });
  const human = (login: string, body: string) => ({
    author: { __typename: "User", login },
    state: "APPROVED",
    body,
    submittedAt: "2024-01-03T00:00:00Z",
  });
  const withReviews = (nodes: ReturnType<typeof bot>[]) =>
    bc({
      associatedPullRequests: {
        nodes: [{ ...pr(42, 0), reviews: { nodes }, closingIssuesReferences: { nodes: [] } }],
      },
    });

  it("drops bot reviews and numbers the human ones from zero", () => {
    const arts = expandCommit(
      withReviews([
        bot("copilot-pull-request-reviewer", "Pull request overview"),
        human("kitten", "The growth formula cut off too early."),
        bot("github-advanced-security", "Code scanning found an issue"),
        human("quantizor", "LGTM"),
      ]),
    );
    const reviews = arts.filter((a) => a.kind === "review");
    expect(reviews.map((a) => [a.id, a.author?.name])).toEqual([
      ["review:42-0", "kitten"],
      ["review:42-1", "quantizor"],
    ]);
  });

  it("does not let bots crowd out the humans past the review cap", () => {
    const bots = Array.from({ length: 6 }, (_, i) => bot(`bot-${i}`, "automated summary"));
    const arts = expandCommit(
      withReviews([...bots, human("ana", "Why not make it configurable?")]),
    );
    expect(arts.filter((a) => a.kind === "review").map((a) => a.author?.name)).toEqual(["ana"]);
  });

  it("reports a PR reviewed only by bots as having no review", () => {
    const arts = expandCommit(withReviews([bot("copilot-pull-request-reviewer", "overview")]));
    expect(arts.some((a) => a.kind === "review")).toBe(false);
    expect(arts.find((a) => a.id === "pr:42")?.meta).toMatchObject({ reviewLookup: "none" });
  });

  it("leaves bot comments out of the folded discussion", () => {
    const arts = expandCommit(
      bc({
        associatedPullRequests: {
          nodes: [
            {
              ...pr(42, 0),
              body: "caps retries",
              comments: {
                nodes: [
                  {
                    author: { __typename: "Bot", login: "changeset-bot" },
                    body: "No changeset found",
                    createdAt: "x",
                  },
                  {
                    author: { __typename: "User", login: "lee" },
                    body: "does this cover webhooks?",
                    createdAt: "x",
                  },
                ],
              },
              closingIssuesReferences: { nodes: [] },
            },
          ],
        },
      }),
    );
    const body = arts.find((a) => a.id === "pr:42")!.body;
    expect(body).toContain("does this cover webhooks?");
    expect(body).not.toContain("changeset");
  });
});
