import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: any) {
  const params = await Promise.resolve(ctx.params);
  const eventId = String(params.eventId || "").trim();

  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: "Nedostaje eventId." },
      { status: 400 }
    );
  }

  const pr = await prisma.purchaseRequest.findUnique({
    where: { eventId },
    select: {
      status: true,
      accessCode: true,
      error: true,
      updatedAt: true,
    },
  });

  if (!pr) {
    return NextResponse.json(
      { ok: false, error: "Zahtev nije pronađen." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, ...pr });
}