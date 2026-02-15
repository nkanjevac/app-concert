export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.currency.findMany({
    where: { isEnabled: true },
    orderBy: { code: "asc" },
    select: { code: true },
  });

  const currencies = rows.map((r) => r.code);

  if (currencies.length === 0) {
    currencies.push("RSD");
  }

  return NextResponse.json({ ok: true, currencies });
}
