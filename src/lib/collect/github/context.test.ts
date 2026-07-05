import { beforeEach, describe, expect, it, vi } from "vitest";

const graphql = vi.fn();
vi.mock("./client", () => ({ graphql: (...args: unknown[]) => graphql(...args) }));

const { prContextArtifacts, issueContextArtifacts, commitContextArtifacts } = await import(
  "./context"
);

beforeEach(() => graphql.mockReset());

const PR = {
  number: 12,
  title: "Cap webhook retries at 3",
  body: "INC-1187: double-billed customers.",
  url: "https://github.com/o/r/pull/12",
  createdAt: "2024-02-01T00:00:00Z",
  commits: {
    nodes: [
      {
        commit: {
          oid: "abcdef1234",
          abbreviatedOid: "abcdef1",
          messageHeadline: "cap retries",
          message: "cap retries",
          url: "https://github.com/o/r/commit/abcdef1",
          committedDate: "2024-02-01T01:00:00Z",
          author: { name: "Ada", email: "ada@x.dev" },
        },
      },
    ],
  },
  reviews: {
    nodes: [
      {
        author: { login: "rev" },
        state: "APPROVED",
        body: "LGTM but watch the cap",
        submittedAt: "2024-02-02T00:00:00Z",
        comments: { nodes: [{ author: { login: "rev" }, body: "inline nit", createdAt: "x" }] },
      },
      {
        author: { login: "silent" },
        state: "COMMENTED",
        body: "",
        submittedAt: "2024-02-02T01:00:00Z",
        comments: { nodes: [] },
      },
    ],
  },
  comments: {
    nodes: [{ author: { login: "pm" }, body: "ship it before EOD", createdAt: "x" }],
  },
  closingIssuesReferences: {
    nodes: [
      {
        number: 5,
        title: "Customers double-billed",
        body: "214 affected",
        url: "https://github.com/o/r/issues/5",
        createdAt: "2024-01-20T00:00:00Z",
        state: "CLOSED",
        stateReason: "COMPLETED",
        comments: { nodes: [{ author: { login: "sre" }, body: "root cause: ACK", createdAt: "x" }] },
      },
    ],
  },
};

describe("prContextArtifacts", () => {
  it("expands a PR into commit/review/issue exhibits and folds discussion into bodies", async () => {
    graphql.mockResolvedValue({ repository: { pullRequest: PR } });
    const arts = await prContextArtifacts("o", "r", 12);
    const ids = arts.map((a) => a.id);

    expect(ids).toContain("pr:12");
    expect(ids).toContain("review:12-0");
    expect(ids).toContain("issue:5");
    expect(ids).toContain("commit:abcdef1");

    expect(ids).not.toContain("review:12-1");

    const pr = arts.find((a) => a.id === "pr:12")!;
    expect(pr.body).toContain("ship it before EOD");

    const issue = arts.find((a) => a.id === "issue:5")!;
    expect(issue.body).toContain("root cause: ACK");
    expect(issue.meta).toMatchObject({ state: "CLOSED", stateReason: "COMPLETED" });
  });

  it("returns nothing when the PR is missing", async () => {
    graphql.mockResolvedValue({ repository: { pullRequest: null } });
    expect(await prContextArtifacts("o", "r", 99)).toEqual([]);
  });
});

describe("issueContextArtifacts", () => {
  it("returns the issue plus cross-referenced pull requests", async () => {
    graphql.mockResolvedValue({
      repository: {
        issue: {
          number: 5,
          title: "Customers double-billed",
          body: "214 affected",
          url: "https://github.com/o/r/issues/5",
          createdAt: "2024-01-20T00:00:00Z",
          state: "CLOSED",
          stateReason: "COMPLETED",
          comments: { nodes: [{ author: { login: "sre" }, body: "linked to #12", createdAt: "x" }] },
          timelineItems: {
            nodes: [
              {
                source: {
                  number: 12,
                  title: "Cap webhook retries at 3",
                  body: "fixes it",
                  url: "https://github.com/o/r/pull/12",
                  createdAt: "2024-02-01T00:00:00Z",
                },
              },
              { source: {} },
            ],
          },
        },
      },
    });
    const arts = await issueContextArtifacts("o", "r", 5);
    const ids = arts.map((a) => a.id);
    expect(ids).toEqual(["issue:5", "pr:12"]);
    expect(arts[0].body).toContain("linked to #12");
  });
});

describe("commitContextArtifacts", () => {
  it("returns the commit and follows into its pull request", async () => {
    graphql
      .mockResolvedValueOnce({
        repository: {
          object: {
            oid: "abcdef1234",
            abbreviatedOid: "abcdef1",
            messageHeadline: "cap retries",
            message: "cap retries",
            url: "https://github.com/o/r/commit/abcdef1",
            committedDate: "2024-02-01T01:00:00Z",
            author: { name: "Ada", email: "ada@x.dev" },
            associatedPullRequests: { nodes: [{ number: 12 }] },
          },
        },
      })
      .mockResolvedValueOnce({ repository: { pullRequest: PR } });

    const arts = await commitContextArtifacts("o", "r", "abcdef1234");
    const ids = arts.map((a) => a.id);
    expect(ids).toContain("commit:abcdef1");
    expect(ids).toContain("pr:12");
    expect(ids).toContain("issue:5");
  });
});
