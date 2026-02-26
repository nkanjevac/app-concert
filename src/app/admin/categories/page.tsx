"use client";

import { useEffect, useState } from "react";

type Row = { id: string; name: string };

async function readJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();

  // fallback: pročitaj text pa javi smislen error
  const text = await res.text();
  throw new Error(
    `Server nije vratio JSON (status ${res.status}). Body: ${text.slice(0, 200)}`
  );
}

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch("/api/admin/categories", {
        headers: { Accept: "application/json" },
      });
      const data = await readJson(res);
      if (!data.ok) return setErr(data.error || "Greška");
      setRows(data.rows);
    } catch (e: any) {
      setErr(e?.message || "Greška pri učitavanju.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await readJson(res);
      if (!data.ok) return setErr(data.error || "Greška");

      setName("");
      load();
    } catch (e: any) {
      setErr(e?.message || "Greška pri čuvanju.");
    }
  }

  async function rename(id: string, newName: string) {
    try {
      setErr(null);
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      const data = await readJson(res);
      if (!data.ok) return setErr(data.error || "Greška");

      load();
    } catch (e: any) {
      setErr(e?.message || "Greška pri izmeni.");
    }
  }

  async function del(id: string) {
    if (!confirm("Obrisati kategoriju?")) return;

    try {
      setErr(null);
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const data = await readJson(res);
      if (!data.ok)
        return setErr(
          data.error || "Ne može da se obriše ako postoje eventi u toj kategoriji."
        );

      load();
    } catch (e: any) {
      setErr(e?.message || "Greška pri brisanju.");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>Kategorije</h1>
      <p>Dodaj/izmeni/obriši kategorije koncerata.</p>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <h2 style={{ marginTop: 20 }}>Nova kategorija</h2>
      <form onSubmit={create} style={{ display: "flex", gap: 10, maxWidth: 600 }}>
        <label style={{ flex: 1 }}>
          <span style={{ display: "none" }}>Naziv kategorije</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naziv kategorije"
            aria-label="Naziv kategorije"
            title="Naziv kategorije"
            style={{ width: "100%", padding: 8 }}
          />
        </label>
        <button type="submit">Dodaj</button>
      </form>

      <h2 style={{ marginTop: 26 }}>Lista</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Naziv
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Akcije
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CategoryRow key={r.id} row={r} onRename={rename} onDelete={del} />
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 25 }}>
        <a href="/admin/dashboard">← Nazad</a>
      </div>
    </div>
  );
}

function CategoryRow({
  row,
  onRename,
  onDelete,
}: {
  row: Row;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(row.name);

  function save() {
    setEdit(false);
    onRename(row.id, val);
  }

  function cancel() {
    setEdit(false);
    setVal(row.name);
  }

  return (
    <tr>
      <td style={{ padding: 8 }}>
        {edit ? (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            aria-label={`Izmeni kategoriju ${row.name}`}
            title={`Izmeni kategoriju ${row.name}`}
            placeholder="Naziv kategorije"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            style={{ padding: 6, width: "100%" }}
          />
        ) : (
          row.name
        )}
      </td>

      <td style={{ padding: 8 }}>
        {edit ? (
          <>
            <button onClick={save} style={{ marginRight: 8 }}>
              Sačuvaj
            </button>
            <button onClick={cancel}>Otkaži</button>
          </>
        ) : (
          <>
            <button onClick={() => setEdit(true)} style={{ marginRight: 8 }}>
              Izmeni
            </button>
            <button onClick={() => onDelete(row.id)}>Obriši</button>
          </>
        )}
      </td>
    </tr>
  );
}