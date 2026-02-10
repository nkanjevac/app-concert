export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currencies = await prisma.currency.findMany({
    where: { isEnabled: true },
    orderBy: { code: "asc" }, 
    select: { code: true },  
  });

  return NextResponse.json({ ok: true, currencies });
}
