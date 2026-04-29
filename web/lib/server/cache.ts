import "server-only";

import { Redis } from "@upstash/redis";

type CacheOptions = {
  ttlSeconds?: number;
};

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else if (process.env.NODE_ENV === "production") {
  throw new Error(
    "UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN are required in production",
  );
}

function handleCacheError(operation: string, key: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Redis cache ${operation} failed for ${key}: ${message}`);
}

function parseCacheValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

export function isCacheAvailable(): boolean {
  return Boolean(redis);
}

export async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get<unknown>(key);
    return parseCacheValue<T>(value);
  } catch (error) {
    handleCacheError("get", key, error);
    return null;
  }
}

export async function set<T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> {
  if (!redis) return;

  try {
    const serialized = JSON.stringify(value);
    if (options.ttlSeconds && options.ttlSeconds > 0) {
      await redis.set(key, serialized, { ex: options.ttlSeconds });
      return;
    }

    await redis.set(key, serialized);
  } catch (error) {
    handleCacheError("set", key, error);
  }
}

export async function del(keys: string | string[]): Promise<number> {
  if (!redis) return 0;

  const keysToDelete = Array.isArray(keys) ? keys : [keys];
  if (keysToDelete.length === 0) return 0;

  try {
    return await redis.del(...keysToDelete);
  } catch (error) {
    handleCacheError("del", keysToDelete.join(","), error);
    return 0;
  }
}

export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const cached = await get<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  await set(key, value, options);
  return value;
}
