import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishTicketEvent } from "@/lib/streams";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();
  const accessCode = String(form.get("accessCode") || "").trim();

  if (!email || !accessCode) {
    return NextResponse.json({ ok: false, error: "Nedostaju podaci." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { email, accessCode },
    select: {
      id: true,
      status: true,
      showId: true,
      email: true,
    },
  });

  if (!reservation) {
    return NextResponse.json({ ok: false, error: "Karta nije pronađena." }, { status: 404 });
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "Karta je već otkazana." }, { status: 400 });
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
      select: {
        id: true,
        accessCode: true,
        showId: true,
        email: true,
        status: true,
        updatedAt: true,
      },
    });

    const issuedPromo = await tx.promoCode.findFirst({
      where: { issuedByReservationId: reservation.id },
      select: { id: true, status: true },
    });

    if (issuedPromo && issuedPromo.status !== "USED") {
      await tx.promoCode.update({
        where: { id: issuedPromo.id },
        data: { status: "INVALID" },
      });
    }

    return updated;
  });

  await publishTicketEvent("ticket.cancelled", {
    reservationId: cancelled.id,
    accessCode: cancelled.accessCode,
    showId: cancelled.showId,
    email: cancelled.email,
    status: cancelled.status,
    cancelledAt: cancelled.updatedAt,
  }).catch(() => {});

  return NextResponse.redirect(
    new URL(`/manage/${accessCode}?email=${encodeURIComponent(email)}&cancelled=1`, req.url)
  );
}