"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("code", code);

      const res = await fetch("/api/admin/login", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        setError("Pogrešan admin kod.");
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError("Greška pri prijavi. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-center">
          <div className="text-xs text-zinc-300/80">Admin panel</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Admin pristup
          </h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-semibold text-zinc-200">
                Admin kod
              </label>
              <input
                id="code"
                type="password"
                placeholder="Unesite admin kod"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/15"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                ❌ {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || code.trim().length === 0}
              className={[
                "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Prijavljivanje…" : "Prijavi se"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="/"
              className="text-sm text-zinc-300 hover:text-white underline underline-offset-4"
            >
              ← Nazad na početnu
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
