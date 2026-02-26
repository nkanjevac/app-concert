"use client";

import { useEffect, useState } from "react";

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  return d.toISOString().split("T")[0];
}

export default function AdminSettingsPage() {
  const [discountDate, setDiscountDate] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setErr(null);
      setMsg(null);
      setLoading(true);

      const res = await fetch("/api/admin/settings/discount");
      const data = await res.json();

      if (!data.ok) return setErr(data.error || "Greška");

      setDiscountDate(data.discountUntil ? toDateInputValue(data.discountUntil) : "");
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    try {
      setErr(null);
      setMsg(null);
      setLoading(true);

      const res = await fetch("/api/admin/settings/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountUntil: discountDate }),
      });

      const data = await res.json();
      if (!data.ok) return setErr(data.error || "Greška");

      setMsg("Sačuvano.");
      await load();
    } catch {
      setErr("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  const isActive = discountDate
    ? new Date() <= new Date(discountDate + "T23:59:59")
    : false;

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl px-5">
      <h1 className="text-3xl font-semibold tracking-tight">Popust 10%</h1>
      <p className="mt-2 text-sm text-white/70">
        Izaberi datum do kog važi popust. Važi do kraja tog dana (23:59).
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label
              htmlFor="discountDate"
              className="block text-sm font-medium text-white/85"
            >
              Datum do kog važi popust
            </label>
            <input
              id="discountDate"
              name="discountDate"
              type="date"
              value={discountDate}
              onChange={(e) => setDiscountDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0 transition focus:border-white/20 focus:bg-black/40"
              title="Izaberi datum do kog važi popust"
              aria-label="Datum do kog važi popust"
            />
            <p className="mt-2 text-xs text-white/55">
              Prazno = nema popusta.
            </p>
          </div>

          <span
            className={[
              "mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1",
              isActive
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
                : "bg-white/5 text-white/70 ring-white/10",
            ].join(" ")}
          >
            {discountDate ? (isActive ? "Aktivan" : "Istekao") : "Nije podešen"}
          </span>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {msg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Čuvanje..." : "Sačuvaj"}
          </button>

          <button
            type="button"
            onClick={() => {
              setDiscountDate("");
              setMsg(null);
              setErr(null);
            }}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Očisti
          </button>
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