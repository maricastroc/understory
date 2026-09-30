import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  narrate: vi.fn(),
  getModel: vi.fn(),
  consumeAiDailyLimit: vi.fn(),
}));

vi.mock("@understory/core/investigate", () => ({ narrate: mocks.narrate }));
vi.mock("@understory/core/llm", () => ({ getModel: mocks.getModel }));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: async () => null,
  consumeAiDailyLimit: mocks.consumeAiDailyLimit,
}));
vi.mock("@/lib/collect/remote", () => ({ collectorAuthError: () => null }));

const { POST } = await import("./route");

const evidence = {
  question: "Why is refundCharge the way it is?",
  repo: { path: "payments-service" },
  location: { file: "src/billing/refund.ts", startLine: 1, endLine: 3 },
  artifacts: [],
  contradictions: [],
};

const call = async (body: unknown) => {
  const res = await POST(
    new Request("http://localhost/api/narrate", { method: "POST", body: JSON.stringify(body) }),
  );
  return { status: res.status, data: await res.json() };
};

beforeEach(() => {
  mocks.narrate.mockReset().mockResolvedValue({ narrative: { answer: "ok", language: "en" } });
  mocks.getModel.mockReset().mockReturnValue({});
  mocks.consumeAiDailyLimit.mockReset().mockResolvedValue(true);
});

describe("POST /api/narrate", () => {
  it("rewrites the given evidence in the asked language, without collecting it again", async () => {
    const { status, data } = await call({ evidence, language: "en" });
    expect(status).toBe(200);
    expect(mocks.narrate).toHaveBeenCalledWith(evidence, { language: "en" });
    expect(data.narrative.language).toBe("en");
  });

  it("only accepts en or pt, and a shaped evidence", async () => {
    expect((await call({ evidence, language: "auto" })).status).toBe(400);
    expect((await call({ evidence: { question: "x" }, language: "pt" })).status).toBe(400);
    expect(mocks.narrate).not.toHaveBeenCalled();
  });

  it("stops at the daily AI limit and says so", async () => {
    mocks.consumeAiDailyLimit.mockResolvedValue(false);
    const { status, data } = await call({ evidence, language: "pt" });
    expect(status).toBe(200);
    expect(data.narrative).toBeNull();
    expect(data.error).toMatch(/temporarily unavailable/);
    expect(mocks.narrate).not.toHaveBeenCalled();
  });
});
