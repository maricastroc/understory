import { afterEach, describe, expect, it, vi } from "vitest";

const REQ = new Request("http://localhost/api/dig", {
  headers: { "x-forwarded-for": "9.9.9.9" },
});

const prefixes: string[] = [];
const limitCalls: string[] = [];

async function load(opts?: { over?: boolean; down?: boolean }) {
  vi.resetModules();
  prefixes.length = 0;
  limitCalls.length = 0;
  if (opts) {
    const { over = false, down = false } = opts;
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.doMock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        constructor(config: { prefix?: string }) {
          prefixes.push(config.prefix ?? "");
        }
        static slidingWindow() {
          return {};
        }
        static fixedWindow() {
          return {};
        }
        limit = async (identifier: string) => {
          limitCalls.push(identifier);
          if (down) throw new TypeError("fetch failed");
          return {
            success: !over,
            limit: 15,
            remaining: over ? 0 : 14,
            reset: Date.now() + 30_000,
          };
        };
      },
    }));
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  return (await import("./ratelimit")).rateLimit;
}

async function loadDaily(opts?: { over?: boolean; down?: boolean }, daily = "25") {
  process.env.AI_DAILY_LIMIT = daily;
  await load(opts);
  return (await import("./ratelimit")).consumeAiDailyLimit;
}

afterEach(() => {
  delete process.env.AI_DAILY_LIMIT;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.doUnmock("@upstash/redis");
  vi.doUnmock("@upstash/ratelimit");
  vi.resetModules();
});

describe("rateLimit", () => {
  it("fails open when Upstash is not configured", async () => {
    const rateLimit = await load();
    expect(await rateLimit(REQ, "ai")).toBeNull();
    expect(await rateLimit(REQ, "browse")).toBeNull();
  });

  it("fails open when Upstash is configured but unreachable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const rateLimit = await load({ down: true });
    expect(await rateLimit(REQ, "browse")).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps every limiter key under the git-investigator:ratelimit namespace", async () => {
    await load({});
    expect(prefixes).toEqual([
      "git-investigator:ratelimit:ai",
      "git-investigator:ratelimit:browse",
      "git-investigator:ratelimit:map",
    ]);
    for (const p of prefixes) expect(p.startsWith("git-investigator:ratelimit:")).toBe(true);
  });

  it("passes through when under the limit", async () => {
    const rateLimit = await load({ over: false });
    expect(await rateLimit(REQ, "ai")).toBeNull();
  });

  it("returns 429 with rate-limit headers when over the limit", async () => {
    const rateLimit = await load({ over: true });
    const res = await rateLimit(REQ, "ai");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("X-RateLimit-Limit"))).toBe(15);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("consumeAiDailyLimit", () => {
  it("allows every investigation when AI_DAILY_LIMIT is unset", async () => {
    await load({});
    const consume = (await import("./ratelimit")).consumeAiDailyLimit;
    expect(await consume()).toBe(true);
    expect(prefixes).not.toContain("git-investigator:ratelimit:ai-daily");
    expect(limitCalls).toEqual([]);
  });

  it("allows every investigation when Upstash is not configured", async () => {
    const consume = await loadDaily();
    expect(await consume()).toBe(true);
    expect(limitCalls).toEqual([]);
  });

  it("consumes one unit of a single global counter under the same namespace", async () => {
    const consume = await loadDaily({ over: false });
    expect(await consume()).toBe(true);
    expect(prefixes).toContain("git-investigator:ratelimit:ai-daily");
    expect(limitCalls).toEqual(["global"]);
  });

  it("reports the cap as reached once the counter is over the limit", async () => {
    const consume = await loadDaily({ over: true });
    expect(await consume()).toBe(false);
  });

  it("ignores an AI_DAILY_LIMIT that is not a positive integer", async () => {
    for (const daily of ["0", "-5", "ten", "2.5"]) {
      const consume = await loadDaily({ over: true }, daily);
      expect(await consume()).toBe(true);
      expect(prefixes).not.toContain("git-investigator:ratelimit:ai-daily");
    }
  });

  it("fails open when Upstash is configured but unreachable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const consume = await loadDaily({ down: true });
    expect(await consume()).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
