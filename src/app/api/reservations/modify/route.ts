import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCapacityOrThrow } from "@/lib/capacity";
import { publishTicketEvent } from "@/lib/streams";

export const runtime = "nodejs";

function toInt(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function POST(req: Request) {
  const form = await req.formData();

  const email = String(form.get("email") || "").trim();
  const accessCode = String(form.get("accessCode") || "").trim();
  const regionId = String(form.get("regionId") || "").trim();
  const qty = toInt(form.get("qty")) ?? 1;

  if (!email || !accessCode || !regionId) {
    return NextResponse.json({ ok: false, error: "Nedostaju podaci." }, { status: 400 });
  }
  if (qty < 1 || qty > 20) {
    return NextResponse.json({ ok: false, error: "Neispravna količina (1–20)." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { email, accessCode },
    include: { items: true },
  });

  if (!reservation) {
    return NextResponse.json({ ok: false, error: "Rezervacija nije pronađena." }, { status: 404 });
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "Otkazana karta ne može da se menja." }, { status: 400 });
  }

  const price = await prisma.showPrice.findUnique({
    where: { showId_regionId: { showId: reservation.showId, regionId } },
  });

  if (!price) {
    return NextResponse.json({ ok: false, error: "Cena za izabrani region nije pronađena." }, { status: 404 });
  }

  try {
    await assertCapacityOrThrow({
      showId: reservation.showId,
      regionId,
      requestedQty: qty,
      excludeReservationId: reservation.id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Nema dovoljno mesta u izabranom regionu." },
      { status: 400 }
    );
  }

  const unitPriceRsd = price.priceRsd;
  const lineTotalRsd = unitPriceRsd * qty;

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      items: {
        deleteMany: {},
        create: [{ regionId, qty, unitPriceRsd, lineTotalRsd }],
      },
      totalRsd: lineTotalRsd,
      currencyCode: "RSD",
      fxRateUsed: null,
      totalInCurrency: null,
    },
    select: {
      id: true,
      accessCode: true,
      showId: true,
      email: true,
      status: true,
      totalRsd: true,
      updatedAt: true,
      items: { select: { regionId: true, qty: true, unitPriceRsd: true, lineTotalRsd: true } },
    },
  });

  await publishTicketEvent("ticket.updated", {
    reservationId: updated.id,
    accessCode: updated.accessCode,
    showId: updated.showId,
    email: updated.email,
    status: updated.status,
    totalRsd: updated.totalRsd,
    items: updated.items,
    updatedAt: updated.updatedAt,
  }).catch(() => {});

  return NextResponse.redirect(
    new URL(`/manage/${accessCode}?email=${encodeURIComponent(email)}&updated=1`, req.url)
  );
}