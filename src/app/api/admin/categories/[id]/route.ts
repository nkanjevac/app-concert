export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params; 
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
  }

  await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params; 
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}