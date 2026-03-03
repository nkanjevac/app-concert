import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { enqueuePurchaseRequested } from "@/lib/streams";

export const runtime = "nodejs";

function int(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const showId = String(form.get("showId") || "").trim();
  const fullName = String(form.get("fullName") || "").trim();
  const email = String(form.get("email") || "").trim();

  const regionId = String(form.get("regionId") || "").trim();
  const qty = int(form.get("qty")) ?? 1;

  const promoCodeTextRaw = String(form.get("promoCode") || "").trim();
  const promoCode = promoCodeTextRaw ? promoCodeTextRaw.toUpperCase() : null;

  const currencyCode = String(form.get("currencyCode") || "RSD").trim().toUpperCase();

  if (!showId || !fullName || !email || !regionId) {
    return NextResponse.json({ ok: false, error: "Nedostaju podaci." }, { status: 400 });
  }

  if (qty < 1 || qty > 20) {
    return NextResponse.json({ ok: false, error: "Neispravna količina (1–20)." }, { status: 400 });
  }

  const price = await prisma.showPrice.findUnique({
    where: { showId_regionId: { showId, regionId } },
    select: { id: true },
  });

  if (!price) {
    return NextResponse.json({ ok: false, error: "Cena za region nije pronađena." }, { status: 404 });
  }

  if (currencyCode !== "RSD") {
    const enabled = await prisma.currency.findFirst({
      where: { code: currencyCode, isEnabled: true },
      select: { code: true },
    });

    if (!enabled) {
      return NextResponse.json({ ok: false, error: "Izabrana valuta nije dozvoljena." }, { status: 400 });
    }
  }

  const eventId = randomUUID();

  await prisma.purchaseRequest.create({
    data: {
      eventId,
      status: "PENDING",
      accessCode: null,
      error: null,
    },
  });

  try {
    await enqueuePurchaseRequested({
      eventId,
      occurredAt: new Date().toISOString(),
      showId,
      fullName,
      email,
      regionId,
      qty,
      promoCode,
      currencyCode,
    });
  } catch (e: any) {
    const err = e?.message ? String(e.message) : "Queue error";

    await prisma.purchaseRequest
      .update({
        where: { eventId },
        data: { status: "REJECTED", error: err, accessCode: null },
      })
      .catch(() => {});

    return NextResponse.json(
      { ok: false, error: "Sistem je trenutno nedostupan. Pokušaj ponovo." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, eventId }, { status: 202 });
}