import { afterEach, describe, expect, it, vi } from "vitest";

const REQ = new Request("http://localhost/api/dig", {
  headers: { "x-forwarded-for": "9.9.9.9" },
});

const prefixes: string[] = [];

async function load(opts?: { over?: boolean; down?: boolean }) {
  vi.resetModules();
  prefixes.length = 0;
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
        limit = async () => {
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
