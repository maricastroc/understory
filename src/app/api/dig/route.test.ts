import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  collect: vi.fn(),
  lineageOf: vi.fn(),
  narrate: vi.fn(),
  getModel: vi.fn(),
  consumeAiDailyLimit: vi.fn(),
  installUrl: vi.fn(),
}));

vi.mock("@understory/core/collect", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@understory/core/collect")>()),
  collect: mocks.collect,
}));
vi.mock("@understory/core/collect/lineage", () => ({ lineageOf: mocks.lineageOf }));
vi.mock("@understory/core/investigate", () => ({ narrate: mocks.narrate }));
vi.mock("@understory/core/llm", () => ({ getModel: mocks.getModel }));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: async () => null,
  consumeAiDailyLimit: mocks.consumeAiDailyLimit,
}));
vi.mock("@/lib/collect/remote", () => ({
  collectorAuthError: () => null,
  maybeDelegate: async () => null,
}));
vi.mock("@/lib/github-app", () => ({
  githubAppConfigured: () => mocks.installUrl() !== null,
  githubTokenForRepo: async () => undefined,
  installUrl: mocks.installUrl,
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
    mocks.installUrl.mockReturnValue(null);
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

describe("/api/dig — the line's earlier history, behind its flag", () => {
  const lineage = {
    stopped: "the line was added",
    entries: [
      { sha: "c038fb3", date: "2023-11-27T00:00:00Z", title: "bound retries", did: "added" },
    ],
  };

  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.installUrl.mockReturnValue(null);
    mocks.collect.mockResolvedValue(evidence);
    mocks.narrate.mockResolvedValue({ narrative: null, error: "narrated" });
    mocks.getModel.mockReturnValue(null);
    vi.unstubAllEnvs();
  });

  it("sends the two lines it always sent, and does not walk, when the flag is off", async () => {
    mocks.lineageOf.mockResolvedValue(lineage);
    const { phases } = await dig();
    expect(phases.map((p) => p.phase)).toEqual(["evidence", "final"]);
    expect(mocks.lineageOf).not.toHaveBeenCalled();
  });

  it("adds the history as a third line, after the answer, when the flag is on", async () => {
    vi.stubEnv("UNDERSTORY_LINEAGE", "1");
    mocks.lineageOf.mockResolvedValue(lineage);
    const { phases } = await dig();
    expect(phases.map((p) => p.phase)).toEqual(["evidence", "final", "lineage"]);
    expect(phases[2].lineage).toEqual(lineage);
    expect(typeof phases[2].ms).toBe("number");
    expect(phases[0].evidence).not.toHaveProperty("lineage");
    expect(mocks.narrate.mock.calls[0][0]).not.toHaveProperty("lineage");
  });

  it("sends the answer without waiting for the walk", async () => {
    vi.stubEnv("UNDERSTORY_LINEAGE", "1");
    let finish: (value: unknown) => void = () => {};
    mocks.lineageOf.mockReturnValue(new Promise((resolve) => (finish = resolve)));
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
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let seen = "";
    while (seen.split("\n").filter(Boolean).length < 2)
      seen += decoder.decode((await reader.read()).value);
    expect(
      seen
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l).phase),
    ).toEqual(["evidence", "final"]);
    finish(lineage);
    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(JSON.parse(rest.trim()).phase).toBe("lineage");
  });

  it("closes with two lines when the walk fails or has nothing to give", async () => {
    vi.stubEnv("UNDERSTORY_LINEAGE", "1");
    mocks.lineageOf.mockRejectedValue(new Error("rate limited"));
    expect((await dig()).phases.map((p) => p.phase)).toEqual(["evidence", "final"]);
    mocks.lineageOf.mockResolvedValue(null);
    expect((await dig()).phases.map((p) => p.phase)).toEqual(["evidence", "final"]);
  });

  it("hands the walk a signal that the request's own abort triggers", async () => {
    vi.stubEnv("UNDERSTORY_LINEAGE", "1");
    mocks.lineageOf.mockResolvedValue(lineage);
    await dig();
    const options = mocks.lineageOf.mock.calls[0][1] as { signal: AbortSignal };
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
  });
});

describe("/api/dig — a collection that fails says what kind of failure it is", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.installUrl.mockReturnValue(null);
    mocks.getModel.mockReturnValue(null);
  });

  const failure = async () => {
    const res = await POST(
      new Request("http://localhost/api/dig", {
        method: "POST",
        body: JSON.stringify({
          repoPath: "https://github.com/acme/payments-service",
          location: "src/billing/charge.ts:8",
        }),
      }),
    );
    return { status: res.status, body: await res.json() };
  };

  it("adds a stable code and the host, and keeps the message it always sent", async () => {
    mocks.collect.mockRejectedValue(new Error("GitHub API 429 — rate limited"));
    const { status, body } = await failure();
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "GitHub API 429 — rate limited",
      detail: "GitHub API 429 — rate limited",
      code: "rate-limited",
      host: "GitHub",
    });
  });

  it("leaves a 403 unnamed rather than calling it a rate limit", async () => {
    mocks.collect.mockRejectedValue(new Error("GitHub API 403 — rate limited"));
    const { body } = await failure();
    expect(body).toMatchObject({ code: "failed", host: "GitHub" });
  });

  it("gives the GitHub App's address apart from the message when it can help", async () => {
    mocks.installUrl.mockReturnValue("https://github.com/apps/understory/installations/new");
    mocks.collect.mockRejectedValue(new Error("GitHub API 404 — not found"));
    const { body } = await failure();
    expect(body).toMatchObject({
      detail: "GitHub API 404 — not found",
      code: "not-found",
      host: "GitHub",
      installUrl: "https://github.com/apps/understory/installations/new",
    });
    expect(body.error).toBe(
      "GitHub API 404 — not found If acme/payments-service is private, install the Understory GitHub App: https://github.com/apps/understory/installations/new",
    );
  });
});
