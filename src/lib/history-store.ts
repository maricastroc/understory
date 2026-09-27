import { Redis } from "@upstash/redis";
import { setPersistentHistoryStore } from "@git-investigator/core/collect/history/history-cache";

const PREFIX = "gi:map:";
const TTL_SECONDS = 90 * 24 * 60 * 60;

let installed = false;

export function ensureHistoryStore(): void {
  if (installed) return;
  installed = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  const redis = new Redis({ url, token, automaticDeserialization: false });
  setPersistentHistoryStore({
    getMany: async (keys) =>
      keys.length ? await redis.mget<Array<string | null>>(...keys.map((k) => PREFIX + k)) : [],
    set: async (key, value) => {
      await redis.set(PREFIX + key, value, { ex: TTL_SECONDS });
    },
  });
}
