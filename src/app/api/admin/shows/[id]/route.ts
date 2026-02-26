export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

type Ctx = { params: Promise<{ id: string }> };
type PriceInput = { regionId: string; priceRsd: number };

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id: showId } = await params; 
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
    .filter((p) => allowed.has(p.regionId) && Number.isFinite(p.priceRsd) && p.priceRsd > 0)
    .map((p) => ({ ...p, priceRsd: Math.trunc(p.priceRsd) }));

  await prisma.show.update({
    where: { id: showId },
    data: { eventId, venueId, startsAt },
  });

  const keepRegionIds: string[] = [];
  for (const p of cleaned) {
    await prisma.showPrice.upsert({
      where: { showId_regionId: { showId, regionId: p.regionId } },
      update: { priceRsd: p.priceRsd },
      create: { showId, regionId: p.regionId, priceRsd: p.priceRsd },
    });
    keepRegionIds.push(p.regionId);
  }

  await prisma.showPrice.deleteMany({
    where: {
      showId,
      ...(keepRegionIds.length ? { regionId: { notIn: keepRegionIds } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id: showId } = await params;
  await prisma.show.delete({ where: { id: showId } });
  return NextResponse.json({ ok: true });
}