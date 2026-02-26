export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

type Ctx = { params: Promise<{ id: string }> };

type RegionInput = {
  id?: string;
  name: string;
  capacity: number;
  sortOrder?: number;
};

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id: venueId } = await params; 
  const body = await req.json().catch(() => null);

  const name = String(body?.name || "").trim();
  const address = String(body?.address || "").trim();
  const city = String(body?.city || "").trim();
  const country = String(body?.country || "Serbia").trim();
  const regions = Array.isArray(body?.regions) ? (body.regions as RegionInput[]) : [];

  if (!name || !address || !city) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const cleaned = regions
    .map((r) => ({
      id: r.id,
      name: String(r.name || "").trim(),
      capacity: Number(r.capacity ?? 0),
      sortOrder: Number(r.sortOrder ?? 0),
    }))
    .filter((r) => r.name.length > 0 && Number.isFinite(r.capacity) && r.capacity > 0);

  await prisma.venue.update({
    where: { id: venueId },
    data: { name, address, city, country },
  });

  const keepIds: string[] = [];

  for (const r of cleaned) {
    if (r.id) {
      const up = await prisma.seatingRegion.update({
        where: { id: r.id },
        data: { name: r.name, capacity: r.capacity, sortOrder: r.sortOrder },
        select: { id: true },
      });
      keepIds.push(up.id);
    } else {
      const created = await prisma.seatingRegion.create({
        data: { venueId, name: r.name, capacity: r.capacity, sortOrder: r.sortOrder },
        select: { id: true },
      });
      keepIds.push(created.id);
    }
  }

  await prisma.seatingRegion.deleteMany({
    where: {
      venueId,
      ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id: venueId } = await params; 
  await prisma.venue.delete({ where: { id: venueId } });
  return NextResponse.json({ ok: true });
}