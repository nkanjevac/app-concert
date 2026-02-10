import { createClient } from "redis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL nije definisan u .env");
}

declare global {
  var __redisClient: ReturnType<typeof createClient> | undefined;
}

export const redis =
  global.__redisClient ??
  createClient({
    url,
  });

if (!global.__redisClient) {
  global.__redisClient = redis;
}

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

let connecting: Promise<void> | null = null;

export async function ensureRedisConnected() {
  if (redis.isOpen) return;
  if (!connecting) {
    connecting = redis.connect().then(() => {});
  }
  await connecting;
}
