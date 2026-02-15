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

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, background: "#f0f0f0", height: 10, borderRadius: 999 }}>
        <div
          style={{
            width: `${pct}%`,
            height: 10,
            borderRadius: 999,
            background: "#111",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ width: 70, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n) + " RSD";
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
    <main style={{ padding: 24 }}>
      <h1>Admin – Izveštaji prodaje (real-time)</h1>
      <p style={{ opacity: 0.7 }}>Računa se samo status: <b>ACTIVE</b>. Osvežavanje na 5 sekundi.</p>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 12,
          display: "flex",
          gap: 12,
          alignItems: "end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
  <label htmlFor="fromDate" style={{ fontSize: 12, opacity: 0.7 }}>
    Od (createdAt)
  </label>
  <input
    id="fromDate"
    type="date"
    value={from}
    onChange={(e) => setFrom(e.target.value)}
  />
</div>

<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
  <label htmlFor="toDate" style={{ fontSize: 12, opacity: 0.7 }}>
    Do (createdAt)
  </label>
  <input
    id="toDate"
    type="date"
    value={to}
    onChange={(e) => setTo(e.target.value)}
  />
</div>


        <button
          type="button"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          style={{ padding: "6px 10px" }}
        >
          Reset filter
        </button>

        <button type="button" onClick={load} style={{ padding: "6px 10px" }}>
          Ručno osveži
        </button>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={card}>
          <div style={cardLabel}>Ukupno karata (po koncertima)</div>
          <div style={cardValue}>{totals.soldShows}</div>
          <div style={cardLabel}>Ukupan prihod (po koncertima)</div>
          <div style={cardValueSmall}>{formatRsd(totals.revShows)}</div>
        </div>

        <div style={card}>
          <div style={cardLabel}>Ukupno karata (po lokacijama)</div>
          <div style={cardValue}>{totals.soldVenues}</div>
          <div style={cardLabel}>Ukupan prihod (po lokacijama)</div>
          <div style={cardValueSmall}>{formatRsd(totals.revVenues)}</div>
        </div>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
      {loading && <p style={{ marginTop: 12 }}>Učitavanje...</p>}

      <section style={{ marginTop: 28 }}>
        <h2>Feature 1 – Broj kupljenih karata po koncertima</h2>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={th}>Koncert</th>
              <th style={th}>Lokacija</th>
              <th style={th}>Datum koncerta</th>
              <th style={th}>Karte</th>
              <th style={th}>Prihod (RSD)</th>
            </tr>
          </thead>
          <tbody>
            {byShow.map((r) => (
              <tr key={r.showId}>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div style={{ opacity: 0.65 }}>{r.artist}</div>
                </td>
                <td style={td}>{r.venueName}</td>
                <td style={td}>{new Date(r.startsAt).toLocaleString()}</td>
                <td style={td}>
                  <Bar value={r.sold} max={maxShowSold} />
                </td>
                <td style={td}>{formatRsd(r.revenueRsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Feature 2 – Broj kupljenih karata po lokacijama</h2>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={th}>Lokacija</th>
              <th style={th}>Karte</th>
              <th style={th}>Prihod (RSD)</th>
            </tr>
          </thead>
          <tbody>
            {byVenue.map((r) => (
              <tr key={r.venueId}>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{r.venueName}</div>
                </td>
                <td style={td}>
                  <Bar value={r.sold} max={maxVenueSold} />
                </td>
                <td style={td}>{formatRsd(r.revenueRsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: 8,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: 8,
  verticalAlign: "top",
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  minWidth: 280,
};

const cardLabel: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
};

const cardValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 8,
};

const cardValueSmall: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
};
