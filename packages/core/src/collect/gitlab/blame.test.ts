import { afterEach, describe, expect, it, vi } from "vitest";
import { blameLinesGitLab, spansFromGitLabRanges } from "./blame";

afterEach(() => vi.unstubAllGlobals());

const raw = (id: string, date: string) => ({
  id,
  short_id: id.slice(0, 8),
  title: `commit ${id}`,
  message: `commit ${id}`,
  committed_date: date,
  web_url: `https://gitlab.com/g/p/-/commit/${id}`,
  author_name: "Ana",
  author_email: null,
});

describe("spansFromGitLabRanges", () => {
  it("numbers consecutive ranges from the window start", () => {
    const spans = spansFromGitLabRanges(
      [
        { commit: raw("a".repeat(40), "2023-01-01T00:00:00Z"), lines: ["x", "y"] },
        { commit: raw("b".repeat(40), "2024-01-01T00:00:00Z"), lines: ["z"] },
      ],
      10,
    );
    expect(spans.map((s) => [s.startLine, s.endLine, s.shortSha])).toEqual([
      [10, 11, "aaaaaaaa"],
      [12, 12, "bbbbbbbb"],
    ]);
    expect(spans[0].author).toBe("Ana");
  });

  it("skips empty ranges without shifting line numbers", () => {
    const spans = spansFromGitLabRanges(
      [
        { commit: raw("a".repeat(40), "2023-01-01T00:00:00Z"), lines: [] },
        { commit: raw("b".repeat(40), "2024-01-01T00:00:00Z"), lines: ["z"] },
      ],
      3,
    );
    expect(spans).toHaveLength(1);
    expect(spans[0].startLine).toBe(3);
  });
});

describe("blameLinesGitLab — merge request lookup status", () => {
  it("separates found, none and failed lookups", async () => {
    const a = raw("a".repeat(40), "2023-01-01T00:00:00Z");
    const b = raw("b".repeat(40), "2023-02-01T00:00:00Z");
    const c = raw("c".repeat(40), "2023-03-01T00:00:00Z");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
        if (url.includes("/blame")) {
          return ok([
            { commit: a, lines: ["1"] },
            { commit: b, lines: ["2"] },
            { commit: c, lines: ["3"] },
          ]);
        }
        if (url.includes(`/commits/${a.id}/merge_requests`)) {
          return ok([{ iid: 5, title: "mr", description: null, web_url: "u", created_at: "t" }]);
        }
        if (url.includes(`/commits/${b.id}/merge_requests`)) return ok([]);
        return { ok: false, status: 500, json: async () => ({}) };
      }),
    );
    const commits = await blameLinesGitLab("gitlab.com", "g/p", "main", "f.ts", 1, 3);
    expect(commits.map((x) => x.prLookup)).toEqual(["found", "none", "failed"]);
  });
});
