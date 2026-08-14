import { Redis } from "@upstash/redis";

/**
 * Thin Upstash Redis wrapper used for real shared state: booked
 * consultation slots and stored orders/bookings. Both `UPSTASH_REDIS_REST_URL`
 * and `UPSTASH_REDIS_REST_TOKEN` must be set (create a store at
 * upstash.com or via the Vercel KV integration) — without them this
 * no-ops with a clear warning instead of crashing, so local dev works
 * before credentials exist. That also means slot-locking and order
 * storage silently don't persist until the env vars are configured.
 */
let client: Redis | null = null;
let warned = false;

function getClient(): Redis | null {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[kv] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
          "bookings and orders are not being persisted anywhere. Set both " +
          "env vars (see .env.local.example) to enable real storage."
      );
      warned = true;
    }
    return null;
  }

  client = new Redis({ url, token });
  return client;
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const c = getClient();
    if (!c) return null;
    return c.get<T>(key);
  },

  async set(key: string, value: unknown): Promise<boolean> {
    const c = getClient();
    if (!c) return false;
    await c.set(key, value);
    return true;
  },

  /** Atomic "claim if not already taken" — the actual slot-locking mechanism. */
  async setIfNotExists(key: string, value: unknown): Promise<boolean> {
    const c = getClient();
    if (!c) return false;
    const result = await c.set(key, value, { nx: true });
    return result === "OK" || result === true;
  },

  async keysWithPrefix(prefix: string): Promise<string[]> {
    const c = getClient();
    if (!c) return [];
    const keys: string[] = [];
    let cursor: string | number = 0;
    do {
      const result: [string | number, string[]] = await c.scan(cursor, { match: `${prefix}*`, count: 100 });
      keys.push(...result[1]);
      cursor = result[0];
    } while (cursor !== 0 && cursor !== "0");
    return keys;
  },

  isConfigured(): boolean {
    return getClient() !== null;
  },
};
