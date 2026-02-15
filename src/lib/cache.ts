import { redis, ensureRedisConnected } from "@/lib/redis";

const HOME_CACHE_KEY = "home:categories";

export async function invalidateHomeCache() {
  try {
    await ensureRedisConnected();
    await redis.del(HOME_CACHE_KEY);
  } catch (e) {
    console.warn("Redis nije dostupan, preskačem brisanje home keša.", e);
  }
}
