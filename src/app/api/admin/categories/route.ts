export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();

  if (!name) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });

  const row = await prisma.category.create({ data: { name }, select: { id: true } });
  return NextResponse.json({ ok: true, id: row.id });
}