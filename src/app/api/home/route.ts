export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, ensureRedisConnected } from "@/lib/redis";

const CACHE_KEY = "home:categories";
const TTL_SECONDS = 120;

export async function GET() {
  try {
    let redisOk = true;
    try {
      await ensureRedisConnected();
    } catch (e) {
      redisOk = false;
      console.warn("Redis nije dostupan, preskačem keš za /api/home.", e);
    }

    if (redisOk) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return NextResponse.json(parsed, {
            headers: {
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          // ako se desi pokvaren cache, ignoriši ga i izračunaj opet
          console.warn("Pokvaren cache za /api/home, ignorišem.", e);
        }
      }
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        events: {
          select: {
            id: true,
            title: true,
            artist: true,
            shows: {
              orderBy: { startsAt: "asc" },
              take: 3,
              select: {
                id: true,
                startsAt: true,
                venue: {
                  select: {
                    name: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const payload = { ok: true, categories };

    if (redisOk) {
      await redis.set(CACHE_KEY, JSON.stringify(payload), { EX: TTL_SECONDS });
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/home error:", err);
    return NextResponse.json(
      { ok: false, error: "Greška pri učitavanju početne." },
      { status: 500 }
    );
  }
}
