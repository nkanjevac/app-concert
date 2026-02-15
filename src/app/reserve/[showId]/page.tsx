import { prisma } from "@/lib/prisma";
import { getDiscountUntil } from "@/lib/settings";
import ReserveForm from "./ReserveForm";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ showId: string }>;
};

export default async function ReservePage({ params }: Props) {
  const { showId } = await params;

  if (!showId) return <main style={{ padding: 24 }}>Nedostaje showId.</main>;

  const [show, discountUntil, enabledCurrencies] = await Promise.all([
    prisma.show.findUnique({
      where: { id: showId },
      select: {
        id: true,
        startsAt: true,
        event: { select: { artist: true, title: true } },
        venue: { select: { name: true, city: true } },
        prices: {
          select: {
            id: true,
            priceRsd: true,
            region: { select: { id: true, name: true } },
          },
          orderBy: { priceRsd: "asc" },
        },
      },
    }),
    getDiscountUntil(),
    prisma.currency.findMany({
      where: { isEnabled: true },
      orderBy: { code: "asc" },
      select: { code: true },
    }),
  ]);

  if (!show) return <main style={{ padding: 24 }}>Termin nije pronađen.</main>;

  const prices = show.prices.map((p) => ({
    regionId: p.region.id,
    regionName: p.region.name,
    priceRsd: p.priceRsd,
  }));

  const currencyOptions = [
    { code: "RSD" as const },
    ...enabledCurrencies.filter((c) => c.code !== "RSD"),
  ];

  return (
    <main style={{ padding: 24 }}>
      <h1>
        {show.event.artist} – {show.event.title}
      </h1>

      <p>
        📍 {show.venue.name}, {show.venue.city}
      </p>
      <p>📅 {new Date(show.startsAt).toLocaleString("sr-RS")}</p>

      <h2>Cene po regionima</h2>
      <ul>
        {show.prices.map((p) => (
          <li key={p.id}>
            {p.region.name}: {p.priceRsd} RSD
          </li>
        ))}
      </ul>

      <h2>Rezervacija</h2>

      <ReserveForm
        showId={show.id}
        prices={prices}
        discountUntilISO={discountUntil ? discountUntil.toISOString() : null}
        currencies={currencyOptions.map((c) => c.code)}
      />
    </main>
  );
}