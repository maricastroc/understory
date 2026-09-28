import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  collect: vi.fn(),
  narrate: vi.fn(),
  getModel: vi.fn(),
  consumeAiDailyLimit: vi.fn(),
}));

vi.mock("@git-investigator/core/collect", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@git-investigator/core/collect")>()),
  collect: mocks.collect,
}));
vi.mock("@git-investigator/core/investigate", () => ({ narrate: mocks.narrate }));
vi.mock("@git-investigator/core/llm", () => ({ getModel: mocks.getModel }));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: async () => null,
  consumeAiDailyLimit: mocks.consumeAiDailyLimit,
}));
vi.mock("@/lib/collect/remote", () => ({
  collectorAuthError: () => null,
  maybeDelegate: async () => null,
}));
vi.mock("@/lib/github-app", () => ({
  githubAppConfigured: () => false,
  githubTokenForRepo: async () => undefined,
  installUrl: () => null,
}));
vi.mock("@/lib/auth/current-user", () => ({ sessionToken: async () => undefined }));
vi.mock("@/lib/history-store", () => ({ ensureHistoryStore: () => {} }));

const { POST } = await import("./route");

const evidence = {
  question: "Why cap retries at 3?",
  repo: { path: "https://github.com/acme/payments-service" },
  location: { file: "src/billing/charge.ts", startLine: 8, endLine: 8 },
  artifacts: [],
  contradictions: [],
};

async function dig() {
  const res = await POST(
    new Request("http://localhost/api/dig", {
      method: "POST",
      body: JSON.stringify({
        repoPath: "https://github.com/acme/payments-service",
        location: "src/billing/charge.ts:8",
        question: "Why cap retries at 3?",
      }),
    }),
  );
  const text = await res.text();
  return {
    status: res.status,
    phases: text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l)),
  };
}

describe("/api/dig — global daily AI limit", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.collect.mockResolvedValue(evidence);
    mocks.narrate.mockResolvedValue({ narrative: null, error: "narrated" });
  });

  it("does not touch the daily counter when no model is configured", async () => {
    mocks.getModel.mockReturnValue(null);
    const { phases } = await dig();
    expect(mocks.consumeAiDailyLimit).not.toHaveBeenCalled();
    expect(mocks.narrate).toHaveBeenCalledOnce();
    expect(phases.map((p) => p.phase)).toEqual(["evidence", "final"]);
  });

  it("consumes one unit and narrates while the daily limit has room", async () => {
    mocks.getModel.mockReturnValue({});
    mocks.consumeAiDailyLimit.mockResolvedValue(true);
    const { phases } = await dig();
    expect(mocks.consumeAiDailyLimit).toHaveBeenCalledOnce();
    expect(mocks.narrate).toHaveBeenCalledOnce();
    expect(phases.at(-1)).toMatchObject({ phase: "final", error: "narrated" });
  });

  it("keeps the evidence and skips the model once the daily limit is reached", async () => {
    mocks.getModel.mockReturnValue({});
    mocks.consumeAiDailyLimit.mockResolvedValue(false);
    const { phases } = await dig();
    expect(mocks.narrate).not.toHaveBeenCalled();
    expect(phases[0]).toMatchObject({ phase: "evidence", evidence });
    expect(phases[1]).toMatchObject({ phase: "final", narrative: null });
    expect(phases[1].error).toBe(
      "AI reconstruction is temporarily unavailable. The evidence and provenance chain below are still complete.",
    );
  });

  it("does not consume the daily limit when collection fails", async () => {
    mocks.getModel.mockReturnValue({});
    mocks.collect.mockRejectedValue(new Error("blame failed"));
    const { status } = await dig();
    expect(status).toBe(400);
    expect(mocks.consumeAiDailyLimit).not.toHaveBeenCalled();
    expect(mocks.narrate).not.toHaveBeenCalled();
  });
});
