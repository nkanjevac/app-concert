export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, artist: true },
  });

  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      regions: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, capacity: true, sortOrder: true },
      },
    },
  });

  return NextResponse.json({ ok: true, events, venues });
}