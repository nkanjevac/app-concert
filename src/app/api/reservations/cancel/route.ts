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
      items: { select: { regionId: true, qty: true, unitPriceRsd: true, lineTotalRsd: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ ok: false, error: "Karta nije pronađena." }, { status: 404 });
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "Karta je već otkazana." }, { status: 400 });
  }

  const showMeta = await prisma.show.findUnique({
    where: { id: reservation.showId },
    select: { eventId: true, venueId: true },
  });

  const totalQty = reservation.items.reduce((s, it) => s + (it.qty ?? 0), 0);
  const ticketsDelta = -totalQty;

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
    eventId: showMeta?.eventId ?? null,
    venueId: showMeta?.venueId ?? null,

    email: cancelled.email,
    status: cancelled.status,

    ticketsDelta, 
    items: reservation.items, 
    cancelledAt: cancelled.updatedAt,
  }).catch(() => {});

  return NextResponse.redirect(
    new URL(`/manage/${accessCode}?email=${encodeURIComponent(email)}&cancelled=1`, req.url)
  );
}