"use client";

import { useEffect, useState } from "react";

type Row = { code: string; name: string; isEnabled: boolean };

export default function AdminCurrenciesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setErr(null);
      setLoading(true);

      const res = await fetch("/api/admin/currencies");
      const data = await res.json();

      if (!data.ok) {
        setErr(data.error || "Greška pri učitavanju.");
        return;
      }

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

  async function toggle(code: string, isEnabled: boolean) {
    // optimistički update
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, isEnabled } : r)));

    try {
      setErr(null);

      const res = await fetch("/api/admin/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isEnabled }),
      });

      const data = await res.json();
      if (!data.ok) {
        // rollback
        setRows((prev) =>
          prev.map((r) => (r.code === code ? { ...r, isEnabled: !isEnabled } : r))
        );
        setErr(data.error || "Greška pri čuvanju.");
      }
    } catch {
      // rollback
      setRows((prev) =>
        prev.map((r) => (r.code === code ? { ...r, isEnabled: !isEnabled } : r))
      );
      setErr("Greška pri komunikaciji sa serverom.");
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-4xl px-5">
      <h1 className="text-3xl font-semibold tracking-tight">Valute</h1>
      <p className="mt-2 text-sm text-white/70">
        Uključi ili isključi valute koje su dozvoljene za plaćanje.
      </p>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur">
        {loading ? (
          <div className="px-5 py-6 text-sm text-white/70">Učitavanje...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/60">
                  <th className="px-5 py-4 border-b border-white/10">Code</th>
                  <th className="px-5 py-4 border-b border-white/10">Name</th>
                  <th className="px-5 py-4 border-b border-white/10">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.code}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-5 py-4 border-b border-white/10 font-mono text-white/90">
                      {r.code}
                    </td>
                    <td className="px-5 py-4 border-b border-white/10 text-white/90">
                      {r.name}
                    </td>
                    <td className="px-5 py-4 border-b border-white/10">
                      <label
                        htmlFor={`currency-${r.code}`}
                        className="inline-flex cursor-pointer items-center gap-3"
                      >
                        <input
                          id={`currency-${r.code}`}
                          type="checkbox"
                          checked={r.isEnabled}
                          onChange={(e) => toggle(r.code, e.target.checked)}
                          className="h-4 w-4 accent-white"
                        />
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-medium ring-1",
                            r.isEnabled
                              ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
                              : "bg-red-500/10 text-red-200 ring-red-500/30",
                          ].join(" ")}
                        >
                          {r.isEnabled ? "Omogućeno" : "Onemogućeno"}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-sm text-white/70" colSpan={3}>
                      Nema valuta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <a
          href="/admin/dashboard"
          className="text-sm text-white/80 hover:text-white underline underline-offset-4"
        >
          ← Nazad
        </a>
      </div>
    </div>
  );
}