import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const configured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = configured ? Redis.fromEnv() : null;

==
const limiters = redis
  ? {
      ai: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15, "60 s"), prefix: "gi:ai" }),
      browse: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(40, "60 s"),
        prefix: "gi:browse",
      }),
    }
  : null;

export type RateTier = "ai" | "browse";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimit(req: Request, tier: RateTier): Promise<NextResponse | null> {
  if (!limiters) return null;

  const { success, limit, remaining, reset } = await limiters[tier].limit(clientIp(req));
  if (success) return null;

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: `Rate limit exceeded — try again in ${retryAfter}s.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
      },
    },
  );
}
