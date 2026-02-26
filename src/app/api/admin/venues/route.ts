export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const rows = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      country: true,
      regions: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, capacity: true, sortOrder: true },
      },
    },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await req.json().catch(() => null);

  const name = String(body?.name || "").trim();
  const address = String(body?.address || "").trim();
  const city = String(body?.city || "").trim();
  const country = String(body?.country || "Serbia").trim();

  if (!name || !address || !city) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: { name, address, city, country },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: venue.id });
}