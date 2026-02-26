export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const rows = await prisma.currency.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true, isEnabled: true },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await req.json().catch(() => null);
  const code = String(body?.code || "").trim().toUpperCase();
  const name = String(body?.name || code).trim();
  const isEnabled = Boolean(body?.isEnabled);

  if (!code) {
    return NextResponse.json({ ok: false, error: "CODE_REQUIRED" }, { status: 400 });
  }

  await prisma.currency.upsert({
    where: { code },
    update: { name, isEnabled },
    create: { code, name, isEnabled },
  });

  return NextResponse.json({ ok: true });
}