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
      totalRsd: true,
      items: { select: { qty: true } },
      show: {
        select: {
          venueId: true,
          venue: { select: { name: true } },
        },
      },
    },
  });

  const map = new Map<string, { venueId: string; venueName: string; sold: number; revenueRsd: number }>();

  for (const r of reservations) {
    const venueId = r.show?.venueId;
    const venueName = r.show?.venue?.name ?? "";
    if (!venueId) continue;

    const soldHere = r.items.reduce((sum, it) => sum + (it.qty ?? 0), 0);
    const revenueHere = r.totalRsd ?? 0;

    const existing = map.get(venueId);
    if (!existing) {
      map.set(venueId, { venueId, venueName, sold: soldHere, revenueRsd: revenueHere });
    } else {
      existing.sold += soldHere;
      existing.revenueRsd += revenueHere;
    }
  }

  const data = Array.from(map.values()).sort((a, b) => b.sold - a.sold);

  return NextResponse.json({ ok: true, data });
}
