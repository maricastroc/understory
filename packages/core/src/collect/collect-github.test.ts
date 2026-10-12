import { afterEach, describe, expect, it, vi } from "vitest";
import { collect } from "./index";
import { runWithTokens } from "./token-context";

const HEAD = "f".repeat(40);
const OWNER = "c".repeat(40);
const BRANCH_HEAD = "e".repeat(40);

type Route = (url: string, body: string, accept: string) => unknown;

function stub(route: Route) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: { body?: string; headers?: Record<string, string> }) => {
      const url = String(input);
      calls.push(url);
      const body = route(url, init?.body ?? "", init?.headers?.Accept ?? "");
      if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => (typeof body === "string" ? body : ""),
      };
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

    const ev = await runWithTokens({ github: "t" }, () =>
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

    const ev = await runWithTokens({ github: "t" }, () =>
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

    const ev = await runWithTokens({ github: "t" }, () =>
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

describe("collect — GitHub shows the investigated code", () => {
  const SOURCE = ["a", "b", "c", "if (found === undefined) {", "e", "f", "g", "h"].join("\n");

  const routes =
    (name: string, source: unknown): Route =>
    (url, body, accept) => {
      if (url.endsWith(`/repos/${name}`)) return meta(name);
      if (url.includes("/contents/")) return accept.includes("raw") ? source : { size: 100 };
      if (body.includes("query Blame")) {
        return {
          data: {
            repository: {
              object: {
                oid: HEAD,
                blame: { ranges: [{ startingLine: 1, endingLine: 8, commit: leanCommit }] },
              },
            },
          },
        };
      }
      if (body.includes("query Enrich")) {
        return { data: { repository: { c0: { associatedPullRequests: { nodes: [] } } } } };
      }
      return undefined;
    };

  const dig = (repoPath: string) =>
    runWithTokens({ github: "t" }, () =>
      collect({
        repoPath,
        question: "why?",
        location: { file: "src/charge.ts", startLine: 4, endLine: 4 },
      }),
    );

  it("keeps the line with its neighbours, read at the revision the blame ran on", async () => {
    const calls = stub(routes("code1/r", SOURCE));
    const ev = await dig("code1/r");

    expect(ev.code).toEqual({ startLine: 1, lines: SOURCE.split("\n").slice(0, 7) });
    expect(calls.some((u) => u.includes(`/contents/src/charge.ts?ref=${HEAD}`))).toBe(true);
  });

  it("still returns the evidence when the file cannot be read", async () => {
    stub((url, body, accept) =>
      url.includes("/contents/") && accept.includes("raw")
        ? undefined
        : routes("code2/r", SOURCE)(url, body, accept),
    );
    const ev = await dig("code2/r");

    expect(ev.artifacts).toHaveLength(1);
    expect(ev).not.toHaveProperty("code");
  });
});
