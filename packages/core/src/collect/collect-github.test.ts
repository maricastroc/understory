import { afterEach, describe, expect, it, vi } from "vitest";
import { collect } from "./index";
import { runWithToken } from "./token-context";

const HEAD = "f".repeat(40);
const OWNER = "c".repeat(40);
const BRANCH_HEAD = "e".repeat(40);

type Route = (url: string, body: string) => unknown;

function stub(route: Route) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: { body?: string }) => {
      const url = String(input);
      calls.push(url);
      const body = route(url, init?.body ?? "");
      if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => body, text: async () => "" };
    }),
  );
  return calls;
}

const meta = (name: string) => ({
  full_name: name,
  default_branch: "main",
  html_url: `https://github.com/${name}`,
  private: false,
  description: null,
  language: null,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  pushed_at: null,
});

const leanCommit = {
  oid: OWNER,
  abbreviatedOid: OWNER.slice(0, 7),
  messageHeadline: "cap retries",
  message: "cap retries",
  committedDate: "2023-03-15T00:00:00Z",
  url: `https://github.com/x/commit/${OWNER}`,
  author: { name: "Priya", email: null },
};

afterEach(() => vi.unstubAllGlobals());

describe("collect — GitHub pins the investigated revision", () => {
  it("records the commit the blame actually ran on and the PR lookup outcome", async () => {
    stub((url, body) => {
      if (url.endsWith("/repos/pin1/r")) return meta("pin1/r");
      if (url.includes("/contents/")) return { size: 100 };
      if (body.includes("query Blame")) {
        return {
          data: {
            repository: {
              object: {
                oid: HEAD,
                blame: { ranges: [{ startingLine: 1, endingLine: 20, commit: leanCommit }] },
              },
            },
          },
        };
      }
      if (body.includes("query Enrich")) {
        return { data: { repository: { c0: { associatedPullRequests: { nodes: [] } } } } };
      }
      return undefined;
    });

    const ev = await runWithToken("t", () =>
      collect({
        repoPath: "pin1/r",
        question: "why?",
        location: { file: "src/charge.ts", startLine: 9, endLine: 9 },
      }),
    );

    expect(ev.repo.sha).toBe(HEAD);
    expect(ev.coverage).toEqual({ granularity: "line" });
    expect(ev.artifacts).toHaveLength(1);
    expect(ev.artifacts[0].meta).toMatchObject({ prLookup: "none" });
  });

  it("resolves the branch head first and reads file history at that sha when blame fails", async () => {
    const calls = stub((url, body) => {
      if (url.endsWith("/repos/pin2/r")) return meta("pin2/r");
      if (url.includes("/contents/")) return { size: 100 };
      if (body.includes("query Blame")) return undefined;
      if (url.includes("/branches/main")) return { commit: { sha: BRANCH_HEAD } };
      if (url.includes("/commits?path=")) {
        return [
          {
            sha: OWNER,
            html_url: `https://github.com/pin2/r/commit/${OWNER}`,
            commit: {
              message: "cap retries",
              author: { name: "Priya", date: "2023-03-15T00:00:00Z" },
            },
          },
        ];
      }
      if (body.includes("query Enrich")) return undefined;
      return undefined;
    });

    const ev = await runWithToken("t", () =>
      collect({
        repoPath: "pin2/r",
        question: "why?",
        location: { file: "src/charge.ts", startLine: 9, endLine: 9 },
      }),
    );

    expect(ev.repo.sha).toBe(BRANCH_HEAD);
    expect(ev.coverage).toEqual({ granularity: "file" });
    expect(
      calls.some((u) => u.includes(`/commits?path=`) && u.includes(`sha=${BRANCH_HEAD}`)),
    ).toBe(true);
    expect(ev.artifacts[0].meta).toMatchObject({ prLookup: "failed" });
  });

  it("leaves the sha out when the branch head cannot be resolved", async () => {
    stub((url, body) => {
      if (url.endsWith("/repos/pin3/r")) return meta("pin3/r");
      if (url.includes("/contents/")) return { size: 5_000_000 };
      if (url.includes("/commits?path=")) return [];
      if (body.includes("query Enrich")) return undefined;
      return undefined;
    });

    const ev = await runWithToken("t", () =>
      collect({
        repoPath: "pin3/r",
        question: "why?",
        location: { file: "big.ts", startLine: 1, endLine: 1 },
      }),
    );

    expect(ev.repo).not.toHaveProperty("sha");
    expect(ev.coverage).toEqual({ granularity: "file" });
  });
});
