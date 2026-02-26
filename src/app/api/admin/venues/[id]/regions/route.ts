export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function int(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(_req: Request, ctx: any) {
  const params = await Promise.resolve(ctx.params);
  const venueId = params.id as string;

  const regions = await prisma.seatingRegion.findMany({
    where: { venueId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, capacity: true, sortOrder: true },
  });

  return NextResponse.json({ ok: true, regions });
}

export async function POST(req: Request, ctx: any) {
  const params = await Promise.resolve(ctx.params);
  const venueId = params.id as string;

  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const capacity = int(body.capacity, 0);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Naziv je obavezan." },
        { status: 400 }
      );
    }

    if (capacity <= 0) {
      return NextResponse.json(
        { ok: false, error: "Kapacitet mora biti > 0." },
        { status: 400 }
      );
    }

    const last = await prisma.seatingRegion.findFirst({
      where: { venueId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const nextSortOrder = last ? last.sortOrder + 10 : 10;

    const region = await prisma.seatingRegion.create({
      data: {
        name,
        capacity,
        sortOrder: nextSortOrder,
        venueId,
      },
      select: { id: true, name: true, capacity: true, sortOrder: true },
    });

    return NextResponse.json({ ok: true, region });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Region sa tim nazivom već postoji za ovu lokaciju." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Greška na serveru." },
      { status: 500 }
    );
  }
}