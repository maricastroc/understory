import { afterEach, describe, expect, it, vi } from "vitest";

const REQ = new Request("http://localhost/api/dig", {
  headers: { "x-forwarded-for": "9.9.9.9" },
});

// The module reads UPSTASH_* env at import time, so each scenario resets modules and
// (when configured) stubs the Upstash client to return a fixed limit verdict.
async function load(opts?: { over: boolean }) {
  vi.resetModules();
  if (opts) {
    const over = opts.over;
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.doMock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit = async () => ({
          success: !over,
          limit: 15,
          remaining: over ? 0 : 14,
          reset: Date.now() + 30_000,
        });
      },
    }));
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  return (await import("./ratelimit")).rateLimit;
}

afterEach(() => {
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
