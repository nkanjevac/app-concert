export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPromoCodeFormat(code: string) {
  return /^[A-Z0-9_-]{6,32}$/.test(code);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ ok: false, error: "Nedostaje code." }, { status: 400 });
  }

  if (!isPromoCodeFormat(code)) {
    return NextResponse.json(
      { ok: true, exists: false, valid: false, discountPct: 0 },
      { status: 200 }
    );
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code },
    select: { status: true, discountPct: true },
  });

  if (!promo) {
    return NextResponse.json({ ok: true, exists: false, valid: false, discountPct: 0 });
  }

  const valid = promo.status === "UNUSED";

  return NextResponse.json({
    ok: true,
    exists: true,
    valid,
    status: promo.status,
    discountPct: promo.discountPct,
  });
}
