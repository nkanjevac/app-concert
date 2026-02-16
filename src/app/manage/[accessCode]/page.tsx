import { prisma } from "@/lib/prisma";
import Link from "next/link";

type Props = {
  params: Promise<{ accessCode: string }>;
  searchParams: Promise<{ email?: string; cancelled?: string; updated?: string }>;
};

function formatDateTimeSr(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("sr-RS", { dateStyle: "full", timeStyle: "short" });
}

function StatusPill({ status }: { status: string }) {
  const base = "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold";
  if (status === "CANCELLED") return <span className={`${base} bg-rose-500/15 text-rose-200 border border-rose-500/25`}>CANCELLED</span>;
  return <span className={`${base} bg-emerald-500/15 text-emerald-200 border border-emerald-500/25`}>ACTIVE</span>;
}

export default async function ManageDetailsPage({ params, searchParams }: Props) {
  const { accessCode } = await params;
  const sp = await searchParams;

  const email = (sp.email || "").trim();
  const cancelledMsg = sp.cancelled === "1";
  const updatedMsg = sp.updated === "1";

  if (!email) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-100">
          Nedostaje email. Vrati se na{" "}
          <Link href="/manage" className="underline underline-offset-4">
            /manage
          </Link>
          .
        </div>
      </main>
    );
  }

  const reservation = await prisma.reservation.findFirst({
    where: { accessCode, email },
    include: {
      show: {
        include: {
          event: true,
          venue: true,
          prices: { include: { region: true } },
        },
      },
      items: { include: { region: true } },
    },
  });

  if (!reservation) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-100">
          Karta nije pronađena.{" "}
          <Link href="/manage" className="underline underline-offset-4">
            Nazad
          </Link>
          .
        </div>
      </main>
    );
  }

  const firstItem = reservation.items[0];
  const currentRegionId = firstItem?.regionId ?? reservation.show.prices[0]?.region.id ?? "";
  const currentQty = firstItem?.qty ?? 1;

  const isCancelled = reservation.status === "CANCELLED";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/15 to-rose-500/20 p-8">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(70%_80%_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="relative">
          <div className="text-xs text-zinc-100/80">Upravljanje kartom</div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Rezervacija #{reservation.accessCode.slice(0, 8)}…
            </h1>
            <StatusPill status={reservation.status} />
          </div>

          <p className="mt-2 max-w-3xl text-sm text-zinc-100/75">
            Ovde možeš da pregledaš detalje i (ako karta nije otkazana) promeniš region ili količinu.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/90">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              ✉️ <span className="font-semibold">{email}</span>
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              🎟️ Šifra: <span className="font-semibold">{reservation.accessCode}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {cancelledMsg ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            ✅ Karta je uspešno otkazana.
          </div>
        ) : null}
        {updatedMsg ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            ✅ Izmene su uspešno sačuvane.
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl bg-white text-zinc-900 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Detalji koncerta</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Informacije o događaju i terminu.
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
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Karte</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Stavke rezervacije po regionima.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="space-y-2">
                  {reservation.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="text-sm font-medium">
                        {it.region.name} <span className="text-zinc-500">× {it.qty}</span>
                      </div>
                      <div className="text-sm font-semibold">{it.lineTotalRsd} RSD</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
                  <span className="text-sm font-semibold">Ukupno</span>
                  <span className="text-sm font-semibold">{reservation.totalRsd} RSD</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-sm font-semibold">Izmena karte</div>
                <p className="mt-1 text-sm text-zinc-600">
                  Promenite region ili količinu (ako karta nije otkazana).
                </p>
              </div>

              <div className="px-5 py-5">
                {isCancelled ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    ℹ️ Otkazana karta ne može da se menja.
                  </div>
                ) : reservation.show.prices.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    Nema definisanih cena za ovaj termin.
                  </div>
                ) : (
                  <form method="post" action="/api/reservations/modify" className="space-y-4">
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="accessCode" value={reservation.accessCode} />

                    <div className="space-y-2">
                      <label htmlFor="regionId" className="text-sm font-semibold text-zinc-800">
                        Novi region
                      </label>
                      <select
                        id="regionId"
                        name="regionId"
                        required
                        defaultValue={currentRegionId}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      >
                        {reservation.show.prices.map((p) => (
                          <option key={p.region.id} value={p.region.id}>
                            {p.region.name} — {p.priceRsd} RSD
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="qty" className="text-sm font-semibold text-zinc-800">
                        Nova količina
                      </label>
                      <input
                        id="qty"
                        name="qty"
                        type="number"
                        min={1}
                        max={20}
                        required
                        defaultValue={currentQty}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      />
                      <p className="text-xs text-zinc-500">Maksimalno 20 karata po rezervaciji.</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Sačuvaj izmene
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/manage"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                ← Nazad
              </Link>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Status rezervacije</div>
              <div className="mt-2 text-sm text-zinc-700">
                Trenutni status: <span className="font-semibold">{reservation.status}</span>
              </div>
              <div className="mt-3 text-xs text-zinc-600">
                ACTIVE rezervacija se računa u izveštajima. CANCELLED se ne može menjati.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">Akcije</div>
              <p className="mt-2 text-sm text-zinc-600">
                Otkazivanje je nepovratna radnja.
              </p>

              <form method="post" action="/api/reservations/cancel" className="mt-4">
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="accessCode" value={reservation.accessCode} />

                <button
                  type="submit"
                  disabled={isCancelled}
                  className={[
                    "!block !w-full !min-h-[48px] !rounded-2xl !px-4 !py-3 !text-sm !font-semibold",
                    isCancelled
                      ? "!border !border-zinc-300 !bg-zinc-100 !text-zinc-600"
                      : "!bg-rose-600 !text-white hover:!bg-rose-700 !shadow-md",
                  ].join(" ")}
                >
                  {isCancelled ? "Karta je već otkazana" : "Otkaži kartu"}
                </button>
              </form>

            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
