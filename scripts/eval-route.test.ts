import { describe, expect, it } from "vitest";
import { pinned, rerouted, routeThroughOpenRouter, tallied, usageLines } from "./eval-route";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const reply = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("rerouted and pinned", () => {
  it("sends a Groq call to the same path on OpenRouter and leaves any other call alone", () => {
    expect(rerouted(GROQ_URL)).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(rerouted("https://api.github.com/repos/o/r")).toBeNull();
  });

  it("pins the request to Groq with no fallback and keeps the rest of the body", () => {
    expect(JSON.parse(pinned('{"model":"openai/gpt-oss-120b","temperature":0}'))).toEqual({
      model: "openai/gpt-oss-120b",
      temperature: 0,
      provider: { only: ["groq"], allow_fallbacks: false },
    });
  });
});

describe("routeThroughOpenRouter", () => {
  const record = () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    return { calls };
  };

  it("swaps the key, pins the host and counts what the call used", async () => {
    const { calls } = record();
    const inner = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return reply({
        provider: "Groq",
        usage: { prompt_tokens: 900, completion_tokens: 300, cost: 0.000315 },
      });
    }) as typeof fetch;
    const route = routeThroughOpenRouter("or-key", inner);

    const response = await route.fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: "Bearer groq-key", "Content-Type": "application/json" },
      body: '{"model":"openai/gpt-oss-120b"}',
    });

    expect(await response.json()).toMatchObject({ provider: "Groq" });
    expect(calls[0].url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe("Bearer or-key");
    expect(JSON.parse(String(calls[0].init?.body)).provider).toEqual({
      only: ["groq"],
      allow_fallbacks: false,
    });
    expect(route.usage()).toEqual({
      "openai/gpt-oss-120b": { calls: 1, input: 900, output: 300, cost: 0.000315 },
    });
  });

  it("refuses an answer that came through another host", async () => {
    const inner = (async () => reply({ provider: "Cerebras" })) as typeof fetch;
    const route = routeThroughOpenRouter("or-key", inner);
    await expect(route.fetch(GROQ_URL, { method: "POST", body: '{"model":"m"}' })).rejects.toThrow(
      "OpenRouter answered through Cerebras, not Groq",
    );
  });

  it("passes other calls and failed calls through untouched", async () => {
    const { calls } = record();
    const inner = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return reply({ error: "rate limited" }, 429);
    }) as typeof fetch;
    const route = routeThroughOpenRouter("or-key", inner);

    await route.fetch("https://api.github.com/repos/o/r", { headers: { Authorization: "t" } });
    const failed = await route.fetch(GROQ_URL, { method: "POST", body: '{"model":"m"}' });

    expect(calls[0].url).toBe("https://api.github.com/repos/o/r");
    expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe("t");
    expect(failed.status).toBe(429);
    expect(route.usage()).toEqual({});
  });
});

describe("tallied and usageLines", () => {
  it("adds up calls, tokens and cost per model and prints a total", () => {
    const once = tallied({}, "big", {
      usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001 },
    });
    const twice = tallied(once, "big", {
      usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.002 },
    });
    const both = tallied(twice, "small", {});
    expect(both).toEqual({
      big: { calls: 2, input: 11, output: 6, cost: 0.003 },
      small: { calls: 1, input: 0, output: 0, cost: 0 },
    });
    expect(usageLines(both)).toEqual([
      "big: 2 calls · 11 tokens in · 6 out · US$ 0.0030",
      "small: 1 calls · 0 tokens in · 0 out · US$ 0.0000",
      "total: US$ 0.0030",
    ]);
    expect(usageLines({})).toEqual([]);
  });
});
