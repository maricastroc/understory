import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRepoMeta: vi.fn(),
  isGitRepo: vi.fn(),
  resolveRepo: vi.fn(),
  resolveRepoInput: vi.fn(),
}));

vi.mock("@understory/core/collect/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@understory/core/collect/github")>()),
  getRepoMeta: mocks.getRepoMeta,
}));
vi.mock("@understory/core/collect/git", () => ({
  isGitRepo: mocks.isGitRepo,
  resolveRepo: mocks.resolveRepo,
}));
vi.mock("@/lib/collect/resolve", () => ({ resolveRepoInput: mocks.resolveRepoInput }));
vi.mock("@/lib/collect/remote", () => ({
  collectorAuthError: () => null,
  maybeDelegate: async () => null,
}));
vi.mock("@/lib/github-app", () => ({ githubTokenForRepo: async () => undefined }));
vi.mock("@/lib/auth/current-user", () => ({ sessionToken: async () => undefined }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: async () => null }));

const { POST } = await import("./route");

const open = async (repo: string) => {
  const res = await POST(
    new Request("http://localhost/api/repo", { method: "POST", body: JSON.stringify({ repo }) }),
  );
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.resolveRepoInput.mockImplementation(async (path: string) => ({ kind: "local", path }));
});

describe("POST /api/repo — what a failure is, besides its message", () => {
  it("reads GitHub's answer for a repository it cannot see", async () => {
    mocks.getRepoMeta.mockRejectedValue(new Error("GitHub API 404 — not found"));
    expect(await open("acme/private-thing")).toEqual({
      status: 400,
      body: { error: "GitHub API 404 — not found", code: "not-found", host: "GitHub" },
    });
  });

  it("names an address that points to a user or an organization", async () => {
    const { status, body } = await open("https://github.com/acme");
    expect(status).toBe(400);
    expect(body.code).toBe("owner-not-repo");
    expect(body.error).toMatch(/points to a GitHub user or org/);
  });

  it("names a local path that is not a repository", async () => {
    mocks.isGitRepo.mockResolvedValue(false);
    expect(await open("./nowhere")).toEqual({
      status: 400,
      body: { error: "Not a git repository: ./nowhere", code: "not-a-repository" },
    });
  });

  it("says git is missing when the server cannot run it", async () => {
    mocks.isGitRepo.mockRejectedValue(new Error("spawn git ENOENT"));
    const { body } = await open("./somewhere");
    expect(body.code).toBe("git-unavailable");
    expect(body.error).toMatch(/Git isn't available/);
  });
});
