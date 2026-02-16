import Link from "next/link";

type Props = {
  searchParams?: Promise<{
    cancelled?: string;
    updated?: string;
  }>;
};

export default async function ManagePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const cancelled = sp.cancelled === "1";
  const updated = sp.updated === "1";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-center">
          <div className="text-xs text-zinc-300/80">Upravljanje rezervacijom</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Upravljaj kartom
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Unesi <span className="font-semibold text-white">email</span> i{" "}
            <span className="font-semibold text-white">šifru (accessCode)</span> da pronađeš svoju rezervaciju.
          </p>
        </div>

        {cancelled ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            ✅ Karta je uspešno otkazana.
          </div>
        ) : null}

        {updated ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            ✅ Izmene su uspešno sačuvane.
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form method="post" action="/api/reservations/lookup" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-zinc-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="npr. natasa@gmail.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/15"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="accessCode" className="text-sm font-semibold text-zinc-200">
                Šifra (accessCode)
              </label>
              <input
                id="accessCode"
                name="accessCode"
                type="text"
                required
                placeholder="npr. fac88ed7-a445-..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/15"
              />
              <p className="text-xs text-zinc-400">
                Šifru dobijaš nakon rezervacije na stranici{" "}
                <span className="font-semibold text-zinc-200">“Rezervacija uspešna”</span>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Pronađi kartu
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
            ℹ️ Ako ste kopirali sifru, nalepite je ovde.
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm text-zinc-300 hover:text-white underline underline-offset-4"
            >
              ← Nazad na početnu
            </Link>

            <Link
              href="/"
              className="text-sm text-zinc-300 hover:text-white underline underline-offset-4"
            >
              + Nova rezervacija
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

