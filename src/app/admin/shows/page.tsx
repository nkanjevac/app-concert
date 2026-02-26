"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type EventRow = { id: string; title: string; artist: string };

type RegionRow = {
  id: string;
  name: string;
  capacity: number;
  sortOrder: number;
};

type VenueRow = {
  id: string;
  name: string;
  city: string;
  regions: RegionRow[];
};

type ShowRow = {
  id: string;
  startsAt: string;
  event: { id: string; title: string; artist: string };
  venue: { id: string; name: string; city: string };
  prices: { id: string; priceRsd: number; region: { id: string; name: string } }[];
};

function int(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalToIso(local: string) {
  return new Date(local).toISOString();
}

export default function AdminShowsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [shows, setShows] = useState<ShowRow[]>([]);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [eventId, setEventId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const [regionEditingId, setRegionEditingId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState("");
  const [regionCapacity, setRegionCapacity] = useState(0);
  const [savingRegion, setSavingRegion] = useState(false);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === venueId) || null,
    [venues, venueId]
  );

  async function loadMeta() {
    const res = await fetch("/api/admin/shows/meta");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "META_ERROR");

    setEvents(data.events);
    setVenues(data.venues);

    if (!eventId && data.events?.[0]) setEventId(data.events[0].id);
    if (!venueId && data.venues?.[0]) setVenueId(data.venues[0].id);
  }

  async function loadShows() {
    const res = await fetch("/api/admin/shows");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "SHOWS_ERROR");
    setShows(data.rows);
  }

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      await Promise.all([loadMeta(), loadShows()]);
    } catch {
      setErr("Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedVenue) return;

    setPrices((prev) => {
      const next = { ...prev };

      for (const r of selectedVenue.regions) {
        if (next[r.id] == null) next[r.id] = 0;
      }

      const allowed = new Set(selectedVenue.regions.map((r) => r.id));
      for (const k of Object.keys(next)) {
        if (!allowed.has(k)) delete next[k];
      }

      return next;
    });
  }, [selectedVenue]);

  function setPrice(regionId: string, value: number) {
    setPrices((prev) => ({ ...prev, [regionId]: value }));
  }

  function resetShowForm() {
    setStartsAtLocal("");
    setPrices({});
    setEditingId(null);
    setErr(null);
  }

  async function createShow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    if (!eventId || !venueId || !startsAtLocal) {
      setErr("Popuni koncert, lokaciju i datum/vreme.");
      return;
    }

    const priceArr = Object.entries(prices)
      .map(([regionId, priceRsd]) => ({ regionId, priceRsd: int(priceRsd, 0) }))
      .filter((p) => p.priceRsd > 0);

    try {
      const res = await fetch("/api/admin/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          venueId,
          startsAt: fromDatetimeLocalToIso(startsAtLocal),
          prices: priceArr,
        }),
      });

      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");

      resetShowForm();
      await loadShows();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  function beginEditShow(s: ShowRow) {
    setEditingId(s.id);
    setEventId(s.event.id);
    setVenueId(s.venue.id);
    setStartsAtLocal(toDatetimeLocal(s.startsAt));

    const map: Record<string, number> = {};
    for (const p of s.prices) map[p.region.id] = p.priceRsd;
    setPrices(map);
  }

  async function saveEditShow() {
    if (!editingId) return;
    setErr(null);

    if (!eventId || !venueId || !startsAtLocal) {
      setErr("Popuni koncert, lokaciju i datum/vreme.");
      return;
    }

    const priceArr = Object.entries(prices)
      .map(([regionId, priceRsd]) => ({ regionId, priceRsd: int(priceRsd, 0) }))
      .filter((p) => p.priceRsd > 0);

    try {
      const res = await fetch(`/api/admin/shows/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          venueId,
          startsAt: fromDatetimeLocalToIso(startsAtLocal),
          prices: priceArr,
        }),
      });

      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");

      setEditingId(null);
      await loadShows();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  async function deleteShow(id: string) {
    if (!confirm("Obrisati zakazivanje?")) return;

    setErr(null);
    try {
      const res = await fetch(`/api/admin/shows/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");
      await loadShows();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  function beginRegionEdit(r: RegionRow) {
    setRegionEditingId(r.id);
    setRegionName(r.name);
    setRegionCapacity(r.capacity);
  }

  function cancelRegionEdit() {
    setRegionEditingId(null);
    setRegionName("");
    setRegionCapacity(0);
  }

  async function saveRegion() {
    if (!venueId) return;

    setErr(null);
    setSavingRegion(true);

    try {
      const payload = {
        name: regionName,
        capacity: regionCapacity,
      };

      const url = regionEditingId
        ? `/api/admin/regions/${regionEditingId}`
        : `/api/admin/venues/${venueId}/regions`;

      const res = await fetch(url, {
        method: regionEditingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Greška.");
        return;
      }

      cancelRegionEdit();
      await loadMeta();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    } finally {
      setSavingRegion(false);
    }
  }

  async function deleteRegion(regionId: string) {
    if (!confirm("Obrisati region?")) return;

    setErr(null);
    try {
      const res = await fetch(`/api/admin/regions/${regionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Greška.");
        return;
      }

      if (regionEditingId === regionId) cancelRegionEdit();
      await loadMeta();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  const inputBase =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-white/20 focus:bg-black/40";

  const regionNameId = "regionName";
  const regionCapId = "regionCapacity";

  return (
    <div className="mx-auto mt-10 w-full max-w-6xl px-5">
      <h1 className="text-3xl font-semibold tracking-tight">Zakazivanje + cene po regionu</h1>
      <p className="mt-2 text-sm text-white/70">
        Izaberi koncert, lokaciju i datum/vreme, zatim unesi cene po regionu (RSD).
      </p>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
       
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{editingId ? "Izmena show-a" : "Novi show"}</h2>
            {editingId ? (
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                U izmeni
              </span>
            ) : null}
          </div>

          <form
            onSubmit={editingId ? (e) => e.preventDefault() : createShow}
            className="mt-4 grid gap-4"
          >
            <div>
              <label htmlFor="eventSelect" className="block text-sm font-medium text-white/85">
                Koncert
              </label>
              <select
                id="eventSelect"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className={inputBase}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.artist} — {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="venueSelect" className="block text-sm font-medium text-white/85">
                Lokacija
              </label>
              <select
                id="venueSelect"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className={inputBase}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startsAt" className="block text-sm font-medium text-white/85">
                Datum/vreme
              </label>
              <input
                id="startsAt"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
                className={inputBase}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90">Regioni (naziv + kapacitet)</h3>
                {selectedVenue ? (
                  <span className="text-xs text-white/60">{selectedVenue.regions.length} region(a)</span>
                ) : null}
              </div>

              {!selectedVenue ? (
                <p className="mt-3 text-sm text-white/70">Izaberi lokaciju da bi dodala regione.</p>
              ) : (
                <>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <label htmlFor={regionNameId} className="block text-xs text-white/70">
                        Naziv
                      </label>
                      <input
                        id={regionNameId}
                        value={regionName}
                        onChange={(e) => setRegionName(e.target.value)}
                        className={inputBase}
                        placeholder="npr. Parter"
                        title="Naziv regiona"
                      />
                    </div>

                    <div>
                      <label htmlFor={regionCapId} className="block text-xs text-white/70">
                        Kapacitet
                      </label>
                      <input
                        id={regionCapId}
                        type="number"
                        min={1}
                        value={regionCapacity}
                        onChange={(e) => setRegionCapacity(int(e.target.value, 0))}
                        className={inputBase}
                        title="Kapacitet regiona"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveRegion}
                        disabled={savingRegion}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                      >
                        {regionEditingId ? "Sačuvaj region" : "Dodaj region"}
                      </button>

                      {regionEditingId ? (
                        <button
                          type="button"
                          onClick={cancelRegionEdit}
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
                        >
                          Otkaži izmenu
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {selectedVenue.regions
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="text-sm text-white/85">
                            {r.name}{" "}
                            <span className="text-xs text-white/60">(kap: {r.capacity})</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => beginRegionEdit(r)}
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
                            >
                              Izmeni
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRegion(r.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/15"
                            >
                              Obriši
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-semibold text-white/90">Cene po regionu (RSD)</h3>

              {!selectedVenue ? (
                <p className="mt-3 text-sm text-white/70">Izaberi lokaciju da se prikažu regioni.</p>
              ) : selectedVenue.regions.length === 0 ? (
                <p className="mt-3 text-sm text-white/70">
                  Nema regiona za ovu lokaciju. Dodaj region iznad.
                </p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {selectedVenue.regions
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((r) => {
                      const priceInputId = `price-${r.id}`;
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-3">
                          <div className="text-sm text-white/85">
                            {r.name}{" "}
                            <span className="text-xs text-white/55">(kap: {r.capacity})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label htmlFor={priceInputId} className="sr-only">
                              Cena za region {r.name} (RSD)
                            </label>
                            
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {editingId ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveEditShow}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Sačuvaj izmene
                </button>
                <button
                  type="button"
                  onClick={resetShowForm}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
                >
                  Otkaži
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Kreiraj koncert
              </button>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista zakazanih</h2>
            {loading && <span className="text-xs text-white/60">Učitavanje…</span>}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/60">
                  <th className="w-[190px] px-4 py-3 border-b border-white/10">Datum</th>
                  <th className="px-4 py-3 border-b border-white/10">Koncert</th>
                  <th className="w-[220px] px-4 py-3 border-b border-white/10">Lokacija</th>
                  <th className="w-[260px] px-4 py-3 border-b border-white/10">Cene</th>
                  <th className="w-[140px] px-4 py-3 border-b border-white/10 text-right">Akcije</th>
                </tr>
              </thead>

              <tbody>
                {shows.map((s) => (
                  <tr key={s.id} className="align-top transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 border-b border-white/10 text-sm text-white/85 whitespace-nowrap">
                      {new Date(s.startsAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 border-b border-white/10">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white/90">
                          {s.event.artist}
                        </div>
                        <div className="truncate text-sm text-white/70">{s.event.title}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 border-b border-white/10">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white/85">{s.venue.name}</div>
                        <div className="truncate text-xs text-white/60">{s.venue.city}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 border-b border-white/10 text-sm text-white/85">
                      <div className="flex flex-wrap gap-2">
                        {s.prices.map((p) => (
                          <span
                            key={p.id}
                            className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/80 ring-1 ring-white/10"
                            title={`${p.region.name}: ${p.priceRsd} RSD`}
                          >
                            {p.region.name}: <span className="font-mono">{p.priceRsd}</span>
                          </span>
                        ))}
                        {s.prices.length === 0 && <span className="text-white/60">Nema cena</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 border-b border-white/10">
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => beginEditShow(s)}
                          className="w-24 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
                        >
                          Izmeni
                        </button>
                        <button
                          onClick={() => deleteShow(s.id)}
                          className="w-24 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/15"
                        >
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {shows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-white/70" colSpan={5}>
                      Nema zakazanih koncerata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          
        </div>
      </div>

      <div className="mt-6">
        <a
          href="/admin/dashboard"
          className="text-sm text-white/80 underline underline-offset-4 hover:text-white"
        >
          ← Nazad
        </a>
      </div>
    </div>
  );
}