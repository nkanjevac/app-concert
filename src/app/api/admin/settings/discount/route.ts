export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

const SINGLETON_ID = "singleton";

function parseDateEndOfDayLocal(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]); 
  const d = Number(m[3]);  

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  const dt = new Date(y, mo - 1, d, 23, 59, 59, 999);

  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }

  return dt;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const settings = await prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
    select: { discountUntil: true },
  });

  return NextResponse.json({ ok: true, discountUntil: settings.discountUntil });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await req.json().catch(() => null);
  const value = String(body?.discountUntil ?? "").trim(); 

  let discountUntil: Date | null = null;

  if (value) {
    const parsed = parseDateEndOfDayLocal(value);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "INVALID_DATE" },
        { status: 400 }
      );
    }
    discountUntil = parsed;
  }

  await prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { discountUntil },
    create: { id: SINGLETON_ID, discountUntil },
  });

  return NextResponse.json({ ok: true, discountUntil });
}