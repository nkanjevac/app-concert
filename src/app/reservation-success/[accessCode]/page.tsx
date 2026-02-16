import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CopyPromo from "./CopyPromo";

type Props = {
  params: Promise<{ accessCode: string }>;
};

function formatDateTimeSr(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("sr-RS", { dateStyle: "full", timeStyle: "short" });
}

export default async function ReservationSuccessPage({ params }: Props) {
  const { accessCode } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { accessCode },
    include: {
      show: { include: { event: true, venue: true } },
      items: { include: { region: true } },
      issuedPromo: true,
    },
  });

  if (!reservation) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-100">
          <h1 className="text-2xl font-semibold tracking-tight">Rezervacija nije pronađena</h1>
          <p className="mt-2 text-sm text-zinc-300">Proveri šifru rezervacije.</p>

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Nazad na početnu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const total = reservation.totalRsd;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/20 via-lime-500/15 to-teal-500/20 p-8">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(70%_80%_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="relative">
          <div className="text-xs text-zinc-100/80">Potvrda rezervacije</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            ✅ Rezervacija uspešna
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-100/80">
            Sačuvaj šifru rezervacije. Može ti trebati za proveru ili upravljanje rezervacijom.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
              Šifra: <span className="font-semibold">{reservation.accessCode}</span>
            </span>
            <CopyPromo value={reservation.accessCode} label="📋 Kopiraj šifru" />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white text-zinc-900 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Detalji događaja</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Informacije o koncertu i terminu rezervacije.
                </p>
              </div>

              <div className="px-5 py-4 text-sm text-zinc-700">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-zinc-600">Koncert</span>
                    <span className="text-right font-semibold">
                      {reservation.show.event.artist} — {reservation.show.event.title}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-zinc-600">Lokacija</span>
                    <span className="text-right font-semibold">
                      {reservation.show.venue.name}, {reservation.show.venue.city}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-zinc-600">Termin</span>
                    <span className="text-right font-semibold">
                      {formatDateTimeSr(reservation.show.startsAt)}
                    </span>
                  </div>

                  {reservation.promoCodeUsed ? (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-zinc-600">Iskorišćen promo</span>
                      <span className="text-right font-semibold">{reservation.promoCodeUsed}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Stavke rezervacije</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Pregled regiona i količine.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="space-y-2">
                  {reservation.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="text-sm font-medium text-zinc-800">
                        {it.region.name} <span className="text-zinc-500">× {it.qty}</span>
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {it.lineTotalRsd} RSD
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-sm font-semibold">Ukupno</span>
                  <span className="text-sm font-semibold">{total} RSD</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                ← Nazad na početnu
              </Link>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">🎁 Promo kod za sledeću kupovinu</div>
              <p className="mt-2 text-sm text-zinc-600">
                Sačuvaj kod — može se iskoristiti samo jednom.
              </p>

              {reservation.issuedPromo ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs font-semibold text-zinc-500">TVOJ KOD</div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">
                    {reservation.issuedPromo.code}
                  </div>
                  <div className="mt-2 text-sm text-zinc-700">
                    Popust: <span className="font-semibold">{reservation.issuedPromo.discountPct}%</span>{" "}
                    <span className="text-zinc-500">(jednokratno)</span>
                  </div>

                  <div className="mt-3">
                    <CopyPromo value={reservation.issuedPromo.code} label="📋 Kopiraj promo kod" />
                  </div>

                  <div className="mt-3 text-xs text-zinc-600">
                    Unesi ga prilikom sledeće rezervacije u polje “Promo kod”.
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  Promo kod još nije generisan.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Šta dalje?</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>Sačuvaj šifru rezervacije (kopiraj klikom).</li>
                <li>Proveri detalje događaja i stavke rezervacije.</li>
                <li>Iskoristi promo kod sledeći put za popust.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
