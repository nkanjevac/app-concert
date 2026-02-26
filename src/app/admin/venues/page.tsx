"use client";

import { useEffect, useMemo, useState } from "react";

type Region = { id?: string; name: string; capacity: number; sortOrder: number };
type VenueRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  regions: { id: string; name: string; capacity: number; sortOrder: number }[];
};

function int(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export default function AdminVenuesPage() {
  const [rows, setRows] = useState<VenueRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // new venue form
  const [nvName, setNvName] = useState("");
  const [nvAddress, setNvAddress] = useState("");
  const [nvCity, setNvCity] = useState("");
  const [nvCountry, setNvCountry] = useState("Serbia");

  // editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) || null, [rows, editingId]);

  const [eName, setEName] = useState("");
  const [eAddress, setEAddress] = useState("");
  const [eCity, setECity] = useState("");
  const [eCountry, setECountry] = useState("Serbia");
  const [eRegions, setERegions] = useState<Region[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/venues");
      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");
      setRows(data.rows);
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(id: string) {
    const v = rows.find((r) => r.id === id);
    if (!v) return;
    setEditingId(id);
    setEName(v.name);
    setEAddress(v.address);
    setECity(v.city);
    setECountry(v.country);
    setERegions(v.regions.map((x) => ({ ...x })));
  }

  function cancelEdit() {
    setEditingId(null);
    setERegions([]);
  }

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nvName,
          address: nvAddress,
          city: nvCity,
          country: nvCountry,
        }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");
      setNvName("");
      setNvAddress("");
      setNvCity("");
      setNvCountry("Serbia");
      await load();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  async function saveVenue() {
    if (!editingId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/admin/venues/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eName,
          address: eAddress,
          city: eCity,
          country: eCountry,
          regions: eRegions,
        }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");
      setEditingId(null);
      await load();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  async function deleteVenue(id: string) {
    if (!confirm("Obrisati lokaciju?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");
      await load();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  function addRegion() {
    setERegions((prev) => [
      ...prev,
      { name: "", capacity: 1, sortOrder: prev.length, id: undefined },
    ]);
  }

  function updateRegion(idx: number, patch: Partial<Region>) {
    setERegions((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRegion(idx: number) {
    setERegions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 20 }}>
      <h1>Lokacije + regioni + kapaciteti</h1>
      <p>Dodaj lokaciju, a zatim definiši regione sedenja i kapacitete.</p>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <h2 style={{ marginTop: 24 }}>Nova lokacija</h2>
      <form onSubmit={createVenue} style={{ display: "grid", gap: 10, maxWidth: 700 }}>
        <input value={nvName} onChange={(e) => setNvName(e.target.value)} placeholder="Naziv" />
        <input value={nvAddress} onChange={(e) => setNvAddress(e.target.value)} placeholder="Adresa" />
        <input value={nvCity} onChange={(e) => setNvCity(e.target.value)} placeholder="Grad" />
        <input value={nvCountry} onChange={(e) => setNvCountry(e.target.value)} placeholder="Država" />
        <button type="submit">Kreiraj</button>
      </form>

      <h2 style={{ marginTop: 28 }}>Postojeće lokacije</h2>
      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Naziv</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Grad</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Adresa</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td style={{ padding: 8 }}>{v.name}</td>
                <td style={{ padding: 8 }}>{v.city}</td>
                <td style={{ padding: 8 }}>{v.address}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => startEdit(v.id)} style={{ marginRight: 8 }}>
                    Izmeni
                  </button>
                  <button onClick={() => deleteVenue(v.id)}>Obriši</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div style={{ marginTop: 28, padding: 16, border: "1px solid #ddd" }}>
          <h2>Izmena lokacije</h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 700 }}>
            <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Naziv" />
            <input value={eAddress} onChange={(e) => setEAddress(e.target.value)} placeholder="Adresa" />
            <input value={eCity} onChange={(e) => setECity(e.target.value)} placeholder="Grad" />
            <input value={eCountry} onChange={(e) => setECountry(e.target.value)} placeholder="Država" />
          </div>

          <h3 style={{ marginTop: 18 }}>Regioni sedenja</h3>
          <button onClick={addRegion}>+ Dodaj region</button>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {eRegions.map((r, idx) => (
              <div key={r.id ?? idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10 }}>
                <input
                  value={r.name}
                  onChange={(e) => updateRegion(idx, { name: e.target.value })}
                  placeholder="Naziv regiona (npr. Parter)"
                />
                <input
                  type="number"
                  value={r.capacity}
                  onChange={(e) => updateRegion(idx, { capacity: int(e.target.value, 1) })}
                  min={1}
                  placeholder="Kapacitet"
                />
                <input
                  type="number"
                  value={r.sortOrder}
                  onChange={(e) => updateRegion(idx, { sortOrder: int(e.target.value, 0) })}
                  placeholder="Sort"
                />
                <button onClick={() => removeRegion(idx)}>X</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button onClick={saveVenue}>Sačuvaj</button>
            <button onClick={cancelEdit}>Otkaži</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 25 }}>
        <a href="/admin/dashboard">← Nazad</a>
      </div>
    </div>
  );
}