export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

type PriceInput = { regionId: string; priceRsd: number };

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const rows = await prisma.show.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      startsAt: true,
      event: { select: { id: true, title: true, artist: true } },
      venue: { select: { id: true, name: true, city: true } },
      prices: {
        select: {
          id: true,
          priceRsd: true,
          region: { select: { id: true, name: true } },
        },
        orderBy: { region: { name: "asc" } },
      },
    },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await req.json().catch(() => null);

  const eventId = String(body?.eventId || "").trim();
  const venueId = String(body?.venueId || "").trim();
  const startsAtStr = String(body?.startsAt || "").trim();
  const prices = Array.isArray(body?.prices) ? (body.prices as PriceInput[]) : [];

  if (!eventId || !venueId || !startsAtStr) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const startsAt = new Date(startsAtStr);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
  }

  const venueRegions = await prisma.seatingRegion.findMany({
    where: { venueId },
    select: { id: true },
  });
  const allowed = new Set(venueRegions.map((r) => r.id));

  const cleaned = prices
    .map((p) => ({ regionId: String(p.regionId), priceRsd: Number(p.priceRsd) }))
    .filter((p) => allowed.has(p.regionId) && Number.isFinite(p.priceRsd) && p.priceRsd > 0);

  const show = await prisma.show.create({
    data: {
      eventId,
      venueId,
      startsAt,
      prices: {
        create: cleaned.map((p) => ({ regionId: p.regionId, priceRsd: Math.trunc(p.priceRsd) })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: show.id });
}