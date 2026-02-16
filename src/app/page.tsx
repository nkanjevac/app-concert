import Link from "next/link";
import { headers } from "next/headers";

type Category = {
  id: string;
  name: string;
  events: Event[];
};

type Event = {
  id: string;
  title: string;
  artist: string;
  shows: Show[];
};

type Show = {
  id: string;
  startsAt: string;
  venue: {
    name: string;
    city: string;
  };
};

function formatDayMonth(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "--", mon: "---" };
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  return { day, mon };
}

function formatDateTimeSr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("sr-RS", { dateStyle: "medium", timeStyle: "short" });
}

async function getHomeData() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  const base =
    host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  const res = await fetch(`${base}/api/home`, { cache: "no-store" });
  if (!res.ok) throw new Error("Neuspešno učitavanje početne.");
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Greška pri učitavanju.");
  return data.categories as Category[];
}

export default async function HomePage() {
  let categories: Category[] = [];

  try {
    categories = await getHomeData();
  } catch (e) {
    console.error("HOME LOAD ERROR:", e);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-100">
          <div className="text-lg font-semibold">Greška pri učitavanju koncerata.</div>
          <p className="mt-2 text-sm text-zinc-300">Osveži stranicu ili proveri /api/home.</p>
        </div>
      </main>
    );
  }

  const rows: Array<{
    categoryName: string;
    eventId: string;
    artist: string;
    title: string;
    show: Show;
  }> = [];

  for (const c of categories) {
    for (const e of c.events) {
      for (const s of e.shows) {
        rows.push({
          categoryName: c.name,
          eventId: e.id,
          artist: e.artist,
          title: e.title,
          show: s,
        });
      }
    }
  }

  rows.sort((a, b) => new Date(a.show.startsAt).getTime() - new Date(b.show.startsAt).getTime());

  const featured = rows[0] ?? null;
  const featuredCity = featured?.show.venue.city ?? "—";
  const featuredVenue = featured?.show.venue.name ?? "—";
  const featuredCategory = featured?.categoryName ?? "—";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-fuchsia-500/20 via-rose-500/15 to-indigo-500/20 p-8">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(70%_80%_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="relative">
          <div className="text-xs text-zinc-200/80">
            Najjednostavnija rezervacija • Regioni • Promo kodovi • Valute
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Rezervacija karata
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-100/80">
            Pronađi termin, odaberi region sedenja i rezerviši kartu u par klikova. Kapacitet po
            regionima je ograničen, zato je najbolje da rezervišeš na vreme.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white text-zinc-900 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-5 py-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm">
            📍 <span className="font-medium">{featuredCity === "—" ? "Lokacija" : featuredCity}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm">
            📅 <span className="font-medium">Svi datumi</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm">
            💸 <span className="font-medium">Cena</span>
          </span>

          <div className="ml-auto text-sm text-zinc-500">{rows.length} termina</div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
                Nema dostupnih termina.
              </div>
            ) : (
              rows.map((r) => {
                const dm = formatDayMonth(r.show.startsAt);
                return (
                  <div
                    key={r.show.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-lime-50 text-center">
                        <div className="py-1 text-[11px] font-semibold text-lime-800">{dm.mon}</div>
                        <div className="border-t border-zinc-200 py-2 text-lg font-semibold">
                          {dm.day}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {r.artist} — {r.title}
                        </div>
                        <div className="mt-1 text-sm text-zinc-600">
                          {formatDateTimeSr(r.show.startsAt)} • {r.show.venue.name} •{" "}
                          {r.show.venue.city}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">Kategorija: {r.categoryName}</div>
                      </div>
                    </div>

                    <Link
                      href={`/reserve/${r.show.id}`}
                      className="shrink-0 rounded-full border border-lime-700 px-4 py-2 text-sm font-semibold text-lime-700 hover:bg-lime-50"
                    >
                      See tickets
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="h-44 w-full bg-gradient-to-br from-zinc-200 to-zinc-100" />
              <div className="p-4">
                <div className="text-xs font-semibold text-zinc-500">ISTAKNUTO</div>
                <div className="mt-1 text-base font-semibold">Kako funkcioniše rezervacija</div>

                <ol className="mt-2 space-y-1 text-sm text-zinc-700">
                  <li>
                    <span className="font-semibold">1)</span> Izaberi termin sa liste levo.
                  </li>
                  <li>
                    <span className="font-semibold">2)</span> Odaberi region sedenja i količinu.
                  </li>
                  <li>
                    <span className="font-semibold">3)</span> Primeni promo kod (ako imaš) i potvrdi rezervaciju.
                  </li>
                </ol>

                <p className="mt-3 text-sm text-zinc-600">
                  Kapacitet po regionima je ograničen. Cene su definisane po regionu, a ukupna cena se
                  prikazuje i u izabranoj valuti.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
                    {featuredCategory}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">{featuredVenue}</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">{featuredCity}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Status ponude</div>

              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <div className="flex items-center justify-between">
                  <span>Dostupno termina</span>
                  <span className="font-semibold">{rows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lokacija</span>
                  <span className="font-semibold">{featuredCity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valuta</span>
                  <span className="font-semibold">RSD / EUR / USD</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Promo kod</span>
                  <span className="font-semibold">Dostupan (po unosu)</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                <span className="font-semibold">Napomena:</span> Ulaznica važi samo za izabrani datum i termin.
                Nakon potvrde, dobijaš potvrdu rezervacije na e-mail.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">Treba ti pomoć?</div>
              <p className="mt-2 text-sm text-zinc-600">
                U “Upravljaj kartom” možeš da pregledaš svoje rezervacije i eventualno proveriš status.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
