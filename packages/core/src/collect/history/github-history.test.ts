import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithTokens } from "../token-context";
import { blameFilesGitHub, prLookupsGitHub } from "./github-history";

afterEach(() => vi.unstubAllGlobals());

function respond(json: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(json), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const range = (s: number, e: number, oid: string) => ({
  startingLine: s,
  endingLine: e,
  commit: { oid, committedDate: "2023-03-15T00:00:00Z" },
});

describe("blameFilesGitHub", () => {
  it("sends one aliased query for every file and keeps partial failures per file", async () => {
    const fetch = respond({
      data: { repository: { object: { f0: { ranges: [range(1, 3, "a")] }, f1: null } } },
      errors: [{ message: "timeout", path: ["repository", "object", "f1"] }],
    });
    const out = await runWithTokens({ github: "t" }, () =>
      blameFilesGitHub("acme", "pay", "head", ["a.ts", "b.ts"]),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.query).toContain("f0: blame(path:$p0)");
    expect(body.query).toContain("f1: blame(path:$p1)");
    expect(body.variables).toMatchObject({ p0: "a.ts", p1: "b.ts", ref: "head" });
    expect(out.get("a.ts")).toEqual([
      { startLine: 1, endLine: 3, sha: "a", date: "2023-03-15T00:00:00Z" },
    ]);
    expect((out.get("b.ts") as Error).message).toBe("timeout");
  });
});

describe("prLookupsGitHub", () => {
  it("answers found or none from one query, and failed when a commit is missing", async () => {
    const fetch = respond({
      data: {
        repository: {
          c0: { associatedPullRequests: { totalCount: 2 } },
          c1: { associatedPullRequests: { totalCount: 0 } },
          c2: null,
        },
      },
    });
    const out = await runWithTokens({ github: "t" }, () =>
      prLookupsGitHub("acme", "pay", ["a", "b", "c"]),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect([...out]).toEqual([
      ["a", "found"],
      ["b", "none"],
      ["c", "failed"],
    ]);
  });
});
