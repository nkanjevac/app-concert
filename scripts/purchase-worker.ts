import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { redis, ensureRedisConnected } from "@/lib/redis";
import { STREAM_PURCHASES, publishTicketEvent } from "@/lib/streams";
import { assertCapacityOrThrow } from "@/lib/capacity";
import { getDiscountUntil } from "@/lib/settings";
import { computeTotalRsd } from "@/lib/pricing";
import { generatePromoCode } from "@/lib/promo";
import { randomUUID } from "crypto";

type ErApiResp = { result: "success" | "error"; rates?: Record<string, number> };

async function getFxRate(from: string, to: string): Promise<number> {
  const f = String(from).trim().toUpperCase();
  const t = String(to).trim().toUpperCase();
  if (f === t) return 1;

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(f)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX API error (${res.status})`);

  const data = (await res.json()) as ErApiResp;
  if (data.result !== "success") throw new Error(`FX API returned error for base ${f}`);

  const rate = data.rates?.[t];
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(`FX rate missing for ${f}->${t}`);
  }
  return rate;
}

const GROUP = "purchases-group";
const CONSUMER = "worker-1";

async function ensureGroup() {
  await ensureRedisConnected();
  try {
    await redis.xGroupCreate(STREAM_PURCHASES, GROUP, "$", { MKSTREAM: true });
  } catch (e: any) {
    if (!String(e?.message || "").includes("BUSYGROUP")) throw e;
  }
}

function pick(map: Record<string, string>, k: string, fallback = "") {
  const v = map[k];
  return typeof v === "string" ? v : fallback;
}

async function handle(evt: {
  eventId: string;
  showId: string;
  fullName: string;
  email: string;
  regionId: string;
  qty: number;
  promoCode: string | null;
  currencyCode: string;
}) {
  const { eventId, showId, fullName, email, regionId, qty, promoCode, currencyCode } = evt;

  if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
    throw new Error("Neispravna količina (1–20).");
  }

  const pr = await prisma.purchaseRequest.findUnique({
    where: { eventId },
    select: { status: true },
  });
  if (pr && (pr.status === "APPROVED" || pr.status === "REJECTED")) return;

  const showMeta = await prisma.show.findUnique({
    where: { id: showId },
    select: { eventId: true, venueId: true },
  });

  const price = await prisma.showPrice.findUnique({
    where: { showId_regionId: { showId, regionId } },
    include: { region: true, show: true },
  });
  if (!price) throw new Error("Cena za region nije pronađena.");

  await assertCapacityOrThrow({ showId, regionId, requestedQty: qty });

  const unitPriceRsd = price.priceRsd;
  const lineTotalRsd = unitPriceRsd * qty;

  let promoPct = 0;
  let promoIdToUse: string | null = null;

  const promoCodeText = promoCode ? promoCode.trim().toUpperCase() : null;

  if (promoCodeText) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCodeText },
      select: { id: true, status: true, discountPct: true },
    });
    if (!promo) throw new Error("Promo kod ne postoji.");
    if (promo.status !== "UNUSED") {
      throw new Error("Promo kod nije važeći (iskorišćen ili nevažeći).");
    }
    promoPct = promo.discountPct ?? 5;
    promoIdToUse = promo.id;
  }

  const discountUntil = await getDiscountUntil();
  const pricing = computeTotalRsd({
    subtotalRsd: lineTotalRsd,
    discountUntil,
    promoPct: promoPct || undefined,
  });

  const curr = (currencyCode || "RSD").trim().toUpperCase();
  let fxRateUsed: number | null = null;
  let totalInCurrency: number | null = null;

  if (curr !== "RSD") {
    const enabled = await prisma.currency.findFirst({
      where: { code: curr, isEnabled: true },
      select: { code: true },
    });
    if (!enabled) throw new Error("Izabrana valuta nije dozvoljena.");

    const rate = await getFxRate("RSD", curr);
    fxRateUsed = rate;
    totalInCurrency = Number((pricing.totalRsd * rate).toFixed(2));
  }

  const accessCode = randomUUID();

  const created = await prisma.$transaction(async (tx) => {
    const created = await tx.reservation.create({
      data: {
        purchaseEventId: eventId,
        showId,
        fullName,
        email,
        accessCode,
        status: "ACTIVE",
        promoCodeUsed: promoCodeText,
        totalRsd: pricing.totalRsd,
        currencyCode: curr,
        fxRateUsed,
        totalInCurrency,
        items: {
          create: [{ regionId, qty, unitPriceRsd, lineTotalRsd }],
        },
      },
      select: { id: true, accessCode: true, showId: true },
    });

    if (promoIdToUse) {
      await tx.promoCode.update({
        where: { id: promoIdToUse },
        data: { status: "USED", usedAt: new Date(), usedByReservationId: created.id },
      });
    }

    const newCode = generatePromoCode();
    await tx.promoCode.create({
      data: {
        code: newCode,
        status: "UNUSED",
        discountPct: 5,
        issuedByReservationId: created.id,
      },
    });

    await tx.purchaseRequest.update({
      where: { eventId },
      data: { status: "APPROVED", accessCode: created.accessCode, error: null },
    });

    return created;
  });

  await publishTicketEvent("ticket.created", {
    reservationId: created.id,
    purchaseEventId: eventId,
    accessCode: created.accessCode,

    showId: created.showId,
    eventId: showMeta?.eventId ?? null,
    venueId: showMeta?.venueId ?? null,

    ticketsDelta: qty, 

    items: [{ regionId, qty, unitPriceRsd, lineTotalRsd }],

    totalRsd: pricing.totalRsd,
    currencyCode: curr,
    fxRateUsed,
    totalInCurrency,

    createdAt: new Date().toISOString(),
  }).catch(() => {});
}

async function main() {
  console.log("Redis Streams purchase worker starting...");
  await ensureGroup();

  while (true) {
    const res = await redis.xReadGroup(
      GROUP,
      CONSUMER,
      [{ key: STREAM_PURCHASES, id: ">" }],
      { COUNT: 1, BLOCK: 5000 }
    );

    if (!res) continue;

    const streams = res as any[];

    for (const stream of streams) {
      for (const msg of stream.messages) {
        const id = msg.id;
        const v = msg.message as Record<string, string>;

        const evt = {
          eventId: pick(v, "eventId"),
          showId: pick(v, "showId"),
          fullName: pick(v, "fullName"),
          email: pick(v, "email"),
          regionId: pick(v, "regionId"),
          qty: Number(pick(v, "qty", "1")),
          promoCode: pick(v, "promoCode") ? pick(v, "promoCode") : null,
          currencyCode: pick(v, "currencyCode", "RSD"),
        };

        try {
          await handle(evt);
          await redis.xAck(STREAM_PURCHASES, GROUP, id);
        } catch (e: any) {
          const err = e?.message ? String(e.message) : "Greška";
          console.error("Worker error:", err);

          await prisma.purchaseRequest
            .upsert({
              where: { eventId: evt.eventId },
              create: {
                eventId: evt.eventId,
                status: "REJECTED",
                accessCode: null,
                error: err,
              },
              update: {
                status: "REJECTED",
                accessCode: null,
                error: err,
              },
            })
            .catch(() => {});

          const showMeta = await prisma.show
            .findUnique({
              where: { id: evt.showId },
              select: { eventId: true, venueId: true },
            })
            .catch(() => null);

          await publishTicketEvent("ticket.purchase_rejected", {
            purchaseEventId: evt.eventId,
            showId: evt.showId,
            eventId: showMeta?.eventId ?? null,
            venueId: showMeta?.venueId ?? null,
            qty: evt.qty,
            error: err,
            rejectedAt: new Date().toISOString(),
          }).catch(() => {});

          await redis.xAck(STREAM_PURCHASES, GROUP, id);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});