import { prisma } from "@/lib/prisma";
import { getDiscountUntil } from "@/lib/settings";
import ReserveForm from "./ReserveForm";
import Link from "next/link";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ showId: string }>;
};

function formatDateTimeSr(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("sr-RS", { dateStyle: "full", timeStyle: "short" });
}

export default async function ReservePage({ params }: Props) {
  const { showId } = await params;

  if (!showId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-100">
          Nedostaje showId.
        </div>
      </main>
    );
  }

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

  if (!show) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-100">
          Termin nije pronađen.
        </div>
      </main>
    );
  }

  const prices = show.prices.map((p) => ({
    regionId: p.region.id,
    regionName: p.region.name,
    priceRsd: p.priceRsd,
  }));

  const currencyOptions = [
    { code: "RSD" as const },
    ...enabledCurrencies.filter((c) => c.code !== "RSD"),
  ];

  const minPrice = show.prices.length ? show.prices[0].priceRsd : null;
  const maxPrice = show.prices.length ? show.prices[show.prices.length - 1].priceRsd : null;

  const discountText = discountUntil
    ? `10% popust važi do ${discountUntil.toLocaleDateString("sr-RS")}.`
    : "Trenutno nema aktivnog vremenskog popusta.";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-fuchsia-500/20 via-rose-500/15 to-indigo-500/20 p-8">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(70%_80%_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="relative">
          <div className="text-xs text-zinc-200/80">Rezervacija termina</div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {show.event.artist} — {show.event.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-100/85">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              📍 {show.venue.name}, {show.venue.city}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              📅 {formatDateTimeSr(show.startsAt)}
            </span>
            {minPrice != null && maxPrice != null && (
              <span className="rounded-full bg-white/10 px-3 py-1.5">
                💸 {minPrice}–{maxPrice} RSD
              </span>
            )}
          </div>

          <p className="mt-4 max-w-3xl text-sm text-zinc-100/75">
            Izaberi region sedenja i količinu karata. Sistem prikazuje ukupnu cenu i u izabranoj
            valuti, a promo kod može da aktivira dodatni popust.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white text-zinc-900 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Cene po regionima</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Cene su izražene u RSD i razlikuju se po regionu sedenja.
                </p>
              </div>

              <div className="px-5 py-4">
                {show.prices.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                    Nema definisanih cena za ovaj termin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {show.prices.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <div className="text-sm font-medium">{p.region.name}</div>
                        <div className="text-sm font-semibold">{p.priceRsd} RSD</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Rezervacija</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Popuni podatke i potvrdi rezervaciju. Promo kod je opcionalan.
                </p>
              </div>

              <div className="px-5 py-5">
                <ReserveForm
                  showId={show.id}
                  prices={prices}
                  discountUntilISO={discountUntil ? discountUntil.toISOString() : null}
                  currencies={currencyOptions.map((c) => c.code)}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Sažetak termina</div>

              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-600">Događaj</span>
                  <span className="text-right font-semibold">
                    {show.event.artist} — {show.event.title}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-600">Lokacija</span>
                  <span className="text-right font-semibold">
                    {show.venue.name}, {show.venue.city}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-600">Datum i vreme</span>
                  <span className="text-right font-semibold">{formatDateTimeSr(show.startsAt)}</span>
                </div>

                {minPrice != null && maxPrice != null && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-zinc-600">Raspon cena</span>
                    <span className="text-right font-semibold">
                      {minPrice}–{maxPrice} RSD
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-600">Valute</span>
                  <span className="text-right font-semibold">
                    {currencyOptions.map((c) => c.code).join(" / ")}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                <span className="font-semibold">Popust:</span> {discountText}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">Važne informacije</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>Ulaznica važi isključivo za izabrani termin.</li>
                <li>Region sedenja određuje cenu i raspoloživost.</li>
                <li>Nakon potvrde rezervacije dobijaš potvrdu na e-mail.</li>
              </ul>

              <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                Ako promeniš valutu, prikaz totalne cene se automatski preračunava po kursu.
              </div>
            </div>

            <Link
              href="/"
              className="block rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              ← Nazad na listu termina
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
