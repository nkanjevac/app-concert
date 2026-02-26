export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function int(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function PUT(req: Request, ctx: any) {
  const params = await Promise.resolve(ctx.params);
  const id = params.id as string;

  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const capacity = int(body.capacity, 0);
    const sortOrder = int(body.sortOrder, 0);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Naziv je obavezan." }, { status: 400 });
    }
    if (capacity <= 0) {
      return NextResponse.json({ ok: false, error: "Kapacitet mora biti > 0." }, { status: 400 });
    }

    const region = await prisma.seatingRegion.update({
      where: { id },
      data: { name, capacity, sortOrder },
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
    return NextResponse.json({ ok: false, error: "Greška na serveru." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: any) {
  const params = await Promise.resolve(ctx.params);
  const id = params.id as string;

  const [pricesCount, itemsCount] = await Promise.all([
    prisma.showPrice.count({ where: { regionId: id } }),
    prisma.reservationItem.count({ where: { regionId: id } }),
  ]);

  if (pricesCount > 0 || itemsCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ne možeš obrisati region koji se već koristi (ima cenu u show-u ili rezervacije).",
      },
      { status: 409 }
    );
  }

  await prisma.seatingRegion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}