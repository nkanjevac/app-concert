"use client";

import { useEffect, useMemo, useState } from "react";

type PriceRow = {
  regionId: string;
  regionName: string;
  priceRsd: number;
};

type PromoState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "valid"; discountPct: number }
  | { state: "invalid"; message: string };

type FxPreview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; fxRateUsed: number; totalInCurrency: number }
  | { state: "error"; message: string };

function round(n: number) {
  return Math.round(n);
}

function formatDateSR(d: Date) {
  return new Intl.DateTimeFormat("sr-RS", {
    timeZone: "Europe/Belgrade",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function inputBase() {
  return "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
}

function labelBase() {
  return "text-sm font-semibold text-zinc-800";
}

export default function ReserveForm(props: {
  showId: string;
  prices: PriceRow[];
  discountUntilISO: string | null;
  currencies?: string[];
}) {
  const { showId, prices, discountUntilISO } = props;

  const currencies = (props.currencies?.length ? props.currencies : ["RSD"])
    .map((c) => String(c).trim().toUpperCase())
    .filter(Boolean);

  const [regionId, setRegionId] = useState(prices[0]?.regionId ?? "");
  const [qty, setQty] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<PromoState>({ state: "idle" });

  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return currencies.includes("RSD") ? "RSD" : (currencies[0] ?? "RSD");
  });

  useEffect(() => {
    if (!currencyCode || !currencies.includes(currencyCode)) {
      setCurrencyCode(currencies.includes("RSD") ? "RSD" : (currencies[0] ?? "RSD"));
    }
  }, [currencies, currencyCode]);

  const [fxPreview, setFxPreview] = useState<FxPreview>({ state: "idle" });

  const discountUntil = discountUntilISO ? new Date(discountUntilISO) : null;
  const discountActive = discountUntil ? new Date() <= discountUntil : false;

  const selectedPrice = useMemo(() => {
    return prices.find((p) => p.regionId === regionId)?.priceRsd ?? 0;
  }, [prices, regionId]);

  const subtotal = useMemo(() => selectedPrice * qty, [selectedPrice, qty]);

  const promoPct = promo.state === "valid" ? promo.discountPct : 0;

  const estimatedTotal = useMemo(() => {
    let total = subtotal;
    if (discountActive) total = round(total * 0.9);
    if (promoPct > 0) total = round(total * (1 - promoPct / 100));
    return total;
  }, [subtotal, discountActive, promoPct]);

  useEffect(() => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromo({ state: "idle" });
      return;
    }

    setPromo({ state: "checking" });

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          setPromo({ state: "invalid", message: data?.error ?? "Greška pri proveri promo koda." });
          return;
        }

        if (!data.exists) {
          setPromo({ state: "invalid", message: "Promo kod ne postoji." });
          return;
        }
        if (!data.valid) {
          setPromo({ state: "invalid", message: "Promo kod nije važeći (iskorišćen ili nevažeći)." });
          return;
        }

        setPromo({ state: "valid", discountPct: Number(data.discountPct ?? 5) });
      } catch {
        setPromo({ state: "invalid", message: "Ne mogu da proverim promo kod." });
      }
    }, 450);

    return () => clearTimeout(t);
  }, [promoCode]);

  useEffect(() => {
    const to = String(currencyCode).trim().toUpperCase();
    const amountRsd = estimatedTotal;

    if (!to || to === "RSD") {
      setFxPreview({ state: "idle" });
      return;
    }

    setFxPreview({ state: "loading" });

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/fx/convert?amountRsd=${encodeURIComponent(String(amountRsd))}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          setFxPreview({ state: "error", message: data?.error ?? "Greška pri kursu." });
          return;
        }

        setFxPreview({
          state: "ok",
          fxRateUsed: Number(data.fxRateUsed),
          totalInCurrency: Number(data.totalInCurrency),
        });
      } catch {
        setFxPreview({ state: "error", message: "Ne mogu da izračunam kurs." });
      }
    }, 250);

    return () => clearTimeout(t);
  }, [currencyCode, estimatedTotal]);

  const promoBadge =
    promo.state === "idle"
      ? null
      : promo.state === "checking"
        ? { text: "Proveravam…", cls: "bg-zinc-100 text-zinc-700" }
        : promo.state === "valid"
          ? { text: `✅ Važi: -${promo.discountPct}%`, cls: "bg-green-50 text-green-700 border border-green-200" }
          : { text: `❌ ${promo.message}`, cls: "bg-rose-50 text-rose-700 border border-rose-200" };

  return (
    <form method="post" action="/api/reservations" className="space-y-5">
      <input type="hidden" name="showId" value={showId} />

      <div className="grid gap-2">
        <label htmlFor="currencyCode" className={labelBase()}>
          Valuta
        </label>
        <select
          id="currencyCode"
          name="currencyCode"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          className={inputBase()}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          Ukupna cena se prikazuje u RSD, a po izboru i preračunata u drugu valutu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="fullName" className={labelBase()}>
            Ime i prezime
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Unesite ime i prezime"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputBase()}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="email" className={labelBase()}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBase()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="regionId" className={labelBase()}>
            Region sedenja
          </label>
          <select
            id="regionId"
            name="regionId"
            required
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className={inputBase()}
          >
            {prices.map((p) => (
              <option key={p.regionId} value={p.regionId}>
                {p.regionName} — {p.priceRsd} RSD
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Region određuje cenu i dostupnost (kapacitet).
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="qty" className={labelBase()}>
            Količina
          </label>
          <input
            id="qty"
            name="qty"
            type="number"
            min={1}
            max={20}
            required
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className={inputBase()}
          />
          <p className="text-xs text-zinc-500">Maksimalno 20 karata po rezervaciji.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="promoCode" className={labelBase()}>
          Promo kod (opciono)
        </label>
        <input
          id="promoCode"
          name="promoCode"
          type="text"
          placeholder="npr. ABCD-EFGH-IJ"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          className={inputBase()}
        />
        {promoBadge ? (
          <div className={["w-fit rounded-full px-3 py-1 text-xs", promoBadge.cls].join(" ")}>
            {promoBadge.text}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Unesi kod ako imaš (validacija ide automatski).</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="text-sm font-semibold">Order summary</div>

        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Cena regiona</span>
            <span className="font-semibold">{selectedPrice} RSD</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Količina</span>
            <span className="font-semibold">{qty}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Subtotal</span>
            <span className="font-semibold">{subtotal} RSD</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">10% popust</span>
            <span className={discountActive ? "font-semibold text-green-700" : "font-semibold"}>
              {discountActive ? "DA" : "NE"}
            </span>
          </div>

          {discountActive && discountUntil ? (
            <div className="text-xs text-zinc-500">
              Važi do {formatDateSR(discountUntil)}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Promo</span>
            <span className={promoPct > 0 ? "font-semibold text-green-700" : "font-semibold"}>
              {promoPct > 0 ? `-${promoPct}%` : "0%"}
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold">Ukupno (procena)</span>
              <span className="font-semibold">{estimatedTotal} RSD</span>
            </div>

            <div className="mt-1 text-sm text-zinc-600">
              {currencyCode === "RSD" ? null : fxPreview.state === "loading" ? (
                <span>Preračunavam u {currencyCode}…</span>
              ) : fxPreview.state === "ok" ? (
                <span>
                  ≈ <span className="font-semibold">{fxPreview.totalInCurrency}</span> {currencyCode}{" "}
                  <span className="text-xs text-zinc-500">(kurs {fxPreview.fxRateUsed})</span>
                </span>
              ) : fxPreview.state === "error" ? (
                <span className="text-rose-700">❌ {fxPreview.message}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 -mx-5 mt-6 border-t border-zinc-300 bg-white px-5 py-5 shadow-[0_-12px_28px_rgba(0,0,0,0.12)]">
        <button
          type="submit"
          className="!block !w-full !min-h-[52px] !rounded-2xl !bg-black !px-4 !py-3 !text-base !font-bold !text-white hover:!bg-zinc-800"
        >
          🎟️ REZERVIŠI KARTU
        </button>

        <p className="mt-3 text-center text-xs text-zinc-600">
          Potvrdom rezervacije prihvataš uslove korišćenja. Potvrda stiže na e-mail.
        </p>
      </div>



    </form>
  );
}
