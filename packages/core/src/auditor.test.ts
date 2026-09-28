import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuditor, runAudit } from "./auditor";
import { TOOL_CALL_ERROR, failingJudge, scriptedJudge } from "./testing/scripted-judge";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuditor", () => {
  it("runs the audit on gpt-oss-20b and falls back to gpt-oss-120b", () => {
    const auditor = getAuditor({ apiKey: "test-key" });
    expect(auditor?.primary.modelId).toBe("openai/gpt-oss-20b");
    expect(auditor?.fallback?.modelId).toBe("openai/gpt-oss-120b");
  });

  it("drops the fallback when the audit already runs on the fallback model", () => {
    vi.stubEnv("GROQ_AUDIT_MODEL", "openai/gpt-oss-120b");
    const auditor = getAuditor({ apiKey: "test-key" });
    expect(auditor?.primary.modelId).toBe("openai/gpt-oss-120b");
    expect(auditor?.fallback).toBeNull();
  });

  it("returns null when no model is configured", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(getAuditor({ apiKey: "" })).toBeNull();
  });
});

describe("runAudit", () => {
  const verdict = { status: "weak", quote: "", reason: "thin" };

  it("returns the primary's answer without touching the fallback", async () => {
    const primary = scriptedJudge(() => verdict);
    const fallback = scriptedJudge(() => verdict);
    const run = await runAudit({ primary, fallback }, async (model) => {
      await model.doGenerate({ prompt: [] });
      return model.modelId;
    });
    expect(run.fellBack).toBe(false);
    expect(fallback.doGenerateCalls).toHaveLength(0);
  });

  it("retries once on the fallback after a technical failure", async () => {
    const primary = failingJudge();
    const fallback = scriptedJudge(() => verdict);
    const run = await runAudit({ primary, fallback }, async (model) =>
      model.doGenerate({ prompt: [] }),
    );
    expect(run.fellBack).toBe(true);
    expect(primary.doGenerateCalls).toHaveLength(1);
    expect(fallback.doGenerateCalls).toHaveLength(1);
  });

  it("surfaces the failure when there is no fallback", async () => {
    await expect(
      runAudit({ primary: failingJudge(), fallback: null }, async (model) =>
        model.doGenerate({ prompt: [] }),
      ),
    ).rejects.toThrow(TOOL_CALL_ERROR);
  });

  it("surfaces the fallback's own failure", async () => {
    await expect(
      runAudit({ primary: failingJudge(), fallback: failingJudge() }, async (model) =>
        model.doGenerate({ prompt: [] }),
      ),
    ).rejects.toThrow(TOOL_CALL_ERROR);
  });
});
