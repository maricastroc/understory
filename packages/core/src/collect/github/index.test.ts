import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFilesGitHub, getRepoMeta, parseGitHubRepo, searchFilesGitHub } from "./index";

function stubGitHub(handler: (url: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const body = handler(String(input));
      if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("parseGitHubRepo", () => {
  it("parses github URLs and shorthand", () => {
    expect(parseGitHubRepo("https://github.com/ggml-org/llama.cpp")).toEqual({
      owner: "ggml-org",
      repo: "llama.cpp",
    });
    expect(parseGitHubRepo("https://github.com/facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
    });
    expect(parseGitHubRepo("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(parseGitHubRepo("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("rejects local paths and non-github inputs", () => {
    for (const input of [
      ".demo/payments-service",
      "./local",
      "/abs/path",
      "~/foo",
      "",
      "just-a-name",
      "https://gitlab.com/a/b",
    ]) {
      expect(parseGitHubRepo(input)).toBeNull();
    }
  });
});

describe("getRepoMeta — field mapping", () => {
  it("maps the REST payload to the app's RepoMeta shape", async () => {
    stubGitHub((url) =>
      url.includes("/repos/o1/r1")
        ? {
            full_name: "o1/r1",
            default_branch: "main",
            html_url: "https://github.com/o1/r1",
            private: false,
            description: "d",
            language: "TypeScript",
            stargazers_count: 1234,
            forks_count: 56,
            open_issues_count: 7,
            pushed_at: "2024-06-01T00:00:00Z",
            topics: ["ai", "tools"],
          }
        : undefined,
    );
    const meta = await getRepoMeta("o1", "r1");
    expect(meta).toMatchObject({
      name: "o1/r1",
      branch: "main",
      language: "TypeScript",
      stars: 1234,
      forks: 56,
      openIssues: 7,
      topics: ["ai", "tools"],
    });
  });
});

describe("defaultFilesGitHub — ranked suggestions", () => {
  it("ranks source over docs/noise, caps the list, and ignores non-blobs", async () => {
    stubGitHub((url) =>
      url.includes("/git/trees/")
        ? {
            tree: [
              { type: "blob", path: "README.md" },
              { type: "blob", path: "src/index.ts" },
              { type: "blob", path: "yarn.lock" },
              { type: "blob", path: "src/service/charge.ts" },
              { type: "tree", path: "src" },
            ],
          }
        : undefined,
    );
    const files = await defaultFilesGitHub("o2", "r2", "main");
    expect(files.length).toBeLessThanOrEqual(5);
    expect(files[0]).toBe("src/index.ts");
    expect(files[files.length - 1]).toBe("yarn.lock");
    expect(files).not.toContain("src");
  });
});

describe("searchFilesGitHub — filename match", () => {
  it("returns tree files that contain the query", async () => {
    stubGitHub((url) => {
      if (url.includes("/git/trees/")) {
        return {
          tree: [
            { type: "blob", path: "src/main.ts" },
            { type: "blob", path: "src/other.ts" },
          ],
        };
      }
      if (url.includes("/search/code")) return { items: [] };
      return undefined;
    });
    const files = await searchFilesGitHub("o3", "r3", "main", "main");
    expect(files).toContain("src/main.ts");
    expect(files).not.toContain("src/other.ts");
  });
});
