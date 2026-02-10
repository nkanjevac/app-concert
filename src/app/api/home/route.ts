export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, ensureRedisConnected } from "@/lib/redis";

const CACHE_KEY = "home:categories:v1";
const TTL_SECONDS = 120;

export async function GET() {
  try {
    await ensureRedisConnected();

    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
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

    await redis.set(CACHE_KEY, JSON.stringify(payload), { EX: TTL_SECONDS });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/home error:", err);
    return NextResponse.json(
      { ok: false, error: "Greška pri učitavanju početne." },
      { status: 500 }
    );
  }
}

