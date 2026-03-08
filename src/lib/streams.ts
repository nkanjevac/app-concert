import { redis, ensureRedisConnected } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const STREAM_PURCHASES = "stream:purchases";
export const STREAM_EVENTS = "stream:ticket_events";

export type PurchaseRequested = {
  eventId: string;
  occurredAt: string;

  showId: string;
  fullName: string;
  email: string;

  regionId: string;
  qty: number;

  promoCode: string | null;
  currencyCode: string;
};

export async function enqueuePurchaseRequested(evt: PurchaseRequested) {
  await ensureRedisConnected();

  await redis.xAdd(STREAM_PURCHASES, "*", {
    eventId: evt.eventId,
    occurredAt: evt.occurredAt,
    showId: evt.showId,
    fullName: evt.fullName,
    email: evt.email,
    regionId: evt.regionId,
    qty: String(evt.qty),
    promoCode: evt.promoCode ?? "",
    currencyCode: evt.currencyCode,
  });
}

export async function publishTicketEvent(
  type: "ticket.created" | "ticket.updated" | "ticket.cancelled" | "ticket.purchase_rejected",
  payload: any
) {
  await ensureRedisConnected();

  let enriched = payload ?? {};

  if (payload?.showId) {
    const show = await prisma.show.findUnique({
      where: { id: payload.showId },
      select: {
        id: true,
        startsAt: true,
        eventId: true,
        venueId: true,
        event: {
          select: {
            id: true,
            title: true,
            artist: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (show) {
      enriched = {
        ...payload,
        showId: show.id,
        eventId: show.eventId ?? show.event?.id,
        venueId: show.venueId ?? show.venue?.id,
        startsAt: show.startsAt,
        eventTitle: show.event?.title,
        eventArtist: show.event?.artist,
        venueName: show.venue?.name,
        venueCity: show.venue?.city,
        venueCountry: show.venue?.country,
      };
    }
  }

  await redis.xAdd(STREAM_EVENTS, "*", {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    type,
    payload: JSON.stringify(enriched),
  });
}