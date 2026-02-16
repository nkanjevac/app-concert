"use client";

import { useEffect, useMemo, useState } from "react";

type ByShowRow = {
  showId: string;
  startsAt: string;
  title: string;
  artist: string;
  venueName: string;
  sold: number;
  revenueRsd: number;
};

type ByVenueRow = {
  venueId: string;
  venueName: string;
  sold: number;
  revenueRsd: number;
};

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n) + " RSD";
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-2 rounded-full bg-zinc-900 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 text-right text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [byShow, setByShow] = useState<ByShowRow[]>([]);
  const [byVenue, setByVenue] = useState<ByVenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  function qs() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  async function load() {
    try {
      setErr(null);
      const suffix = qs();

      const [resShow, resVenue] = await Promise.all([
        fetch(`/api/admin/reports/by-show${suffix}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/by-venue${suffix}`, { cache: "no-store" }),
      ]);

      const dataShow = await resShow.json();
      const dataVenue = await resVenue.json();

      if (!resShow.ok || !dataShow.ok) throw new Error(dataShow.error || "Greška (by-show).");
      if (!resVenue.ok || !dataVenue.ok) throw new Error(dataVenue.error || "Greška (by-venue).");

      setByShow(dataShow.data);
      setByVenue(dataVenue.data);
    } catch (e: any) {
      setErr(e.message || "Greška.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [from, to]);

  const maxShowSold = useMemo(() => Math.max(0, ...byShow.map((x) => x.sold)), [byShow]);
  const maxVenueSold = useMemo(() => Math.max(0, ...byVenue.map((x) => x.sold)), [byVenue]);

  const totals = useMemo(() => {
    const soldShows = byShow.reduce((s, x) => s + x.sold, 0);
    const revShows = byShow.reduce((s, x) => s + x.revenueRsd, 0);
    const soldVenues = byVenue.reduce((s, x) => s + x.sold, 0);
    const revVenues = byVenue.reduce((s, x) => s + x.revenueRsd, 0);
    return { soldShows, revShows, soldVenues, revVenues };
  }, [byShow, byVenue]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <div className="text-xs text-zinc-300/80">Admin</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Izveštaji prodaje (real-time)
        </h1>
        <p className="mt-2 text-sm text-zinc-300">
          Računa se samo status: <span className="font-semibold text-white">ACTIVE</span>
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fromDate" className="text-xs text-zinc-300/80">
              Od (createdAt)
            </label>
            <input
              id="fromDate"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-44 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="toDate" className="text-xs text-zinc-300/80">
              Do (createdAt)
            </label>
            <input
              id="toDate"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-44 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            />
          </div>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Reset filter
            </button>

            <button
              type="button"
              onClick={load}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ručno osveži
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            ❌ {err}
          </div>
        ) : null}

        {loading ? <div className="mt-4 text-sm text-zinc-300">Učitavanje…</div> : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-xs text-zinc-300/80">Po koncertima</div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-300/80">Ukupno karata</div>
              <div className="mt-1 text-3xl font-bold text-white">{totals.soldShows}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-300/80">Ukupan prihod</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatRsd(totals.revShows)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-xs text-zinc-300/80">Po lokacijama</div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-300/80">Ukupno karata</div>
              <div className="mt-1 text-3xl font-bold text-white">{totals.soldVenues}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-300/80">Ukupan prihod</div>
              <div className="mt-2 text-lg font-semibold text-white">{formatRsd(totals.revVenues)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white text-zinc-900 shadow-sm">
        <div className="p-5">
          <section>
            <h2 className="text-lg font-semibold">Kupljene karte po koncertima</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Prikaz termina, broja prodatih karata i prihoda.
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-50">
                  <tr className="text-left">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Koncert</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Lokacija</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Datum koncerta</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Karte</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Prihod</th>
                  </tr>
                </thead>
                <tbody>
                  {byShow.map((r) => (
                    <tr key={r.showId} className="border-t border-zinc-200">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.title}</div>
                        <div className="text-xs text-zinc-500">{r.artist}</div>
                      </td>
                      <td className="px-4 py-3">{r.venueName}</td>
                      <td className="px-4 py-3">{new Date(r.startsAt).toLocaleString("sr-RS")}</td>
                      <td className="px-4 py-3">
                        <ProgressBar value={r.sold} max={maxShowSold} />
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatRsd(r.revenueRsd)}</td>
                    </tr>
                  ))}
                  {byShow.length === 0 ? (
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-6 text-zinc-600" colSpan={5}>
                        Nema podataka za prikaz.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold"> Kupljene karte po lokacijama</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Sumirano po lokacijama (venue).
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-50">
                  <tr className="text-left">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Lokacija</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Karte</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">Prihod</th>
                  </tr>
                </thead>
                <tbody>
                  {byVenue.map((r) => (
                    <tr key={r.venueId} className="border-t border-zinc-200">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.venueName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={r.sold} max={maxVenueSold} />
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatRsd(r.revenueRsd)}</td>
                    </tr>
                  ))}
                  {byVenue.length === 0 ? (
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-6 text-zinc-600" colSpan={3}>
                        Nema podataka za prikaz.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
