export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const url = new URL(req.url);
  const from = parseDate(url.searchParams.get("from")); 
  const to = parseDate(url.searchParams.get("to"));    

  const where: any = { status: "ACTIVE" };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const reservations = await prisma.reservation.findMany({
    where,
    select: {
      showId: true,
      totalRsd: true,
      show: {
        select: {
          startsAt: true,
          venue: { select: { name: true } },
          event: { select: { title: true, artist: true } },
        },
      },
      items: { select: { qty: true } },
    },
  });

  const map = new Map<
    string,
    {
      showId: string;
      startsAt: string;
      title: string;
      artist: string;
      venueName: string;
      sold: number;
      revenueRsd: number;
    }
  >();

  for (const r of reservations) {
    const soldHere = r.items.reduce((sum, it) => sum + (it.qty ?? 0), 0);
    const revenueHere = r.totalRsd ?? 0;

    const s = r.show;
    if (!s) continue;

    const existing = map.get(r.showId);
    if (!existing) {
      map.set(r.showId, {
        showId: r.showId,
        startsAt: s.startsAt.toISOString(),
        title: s.event.title,
        artist: s.event.artist,
        venueName: s.venue?.name ?? "",
        sold: soldHere,
        revenueRsd: revenueHere,
      });
    } else {
      existing.sold += soldHere;
      existing.revenueRsd += revenueHere;
    }
  }

  const data = Array.from(map.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return NextResponse.json({ ok: true, data });
}


