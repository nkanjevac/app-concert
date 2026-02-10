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

type FxPreview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; fxRateUsed: number; totalInCurrency: number }
  | { state: "error"; message: string };

export default function ReserveForm(props: {
  showId: string;
  prices: PriceRow[];
  discountUntilISO: string | null;
  currencies?: string[];
}) {
  const { showId, prices, discountUntilISO } = props;

  const currencies = (props.currencies?.length ? props.currencies : ["RSD"]).map((c) =>
    String(c).trim().toUpperCase()
  );
  


  const [regionId, setRegionId] = useState(prices[0]?.regionId ?? "");
  const [qty, setQty] = useState(1);
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

  return (
    <form method="post" action="/api/reservations">
      <input type="hidden" name="showId" value={showId} />

      <div style={{ marginTop: 12 }}>
        <label htmlFor="currencyCode">Valuta</label>
        <br />
        <select
          id="currencyCode"
          name="currencyCode"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="fullName">Ime i prezime</label>
        <br />
        <input id="fullName" name="fullName" type="text" required placeholder="Unesite ime i prezime" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="email">Email</label>
        <br />
        <input id="email" name="email" type="email" required placeholder="example@email.com" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="regionId">Region sedenja</label>
        <br />
        <select
          id="regionId"
          name="regionId"
          required
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
        >
          {prices.map((p) => (
            <option key={p.regionId} value={p.regionId}>
              {p.regionName} – {p.priceRsd} RSD
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="qty">Količina</label>
        <br />
        <input
          id="qty"
          name="qty"
          type="number"
          min={1}
          max={20}
          required
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="promoCode">Promo kod (opciono)</label>
        <br />
        <input
          id="promoCode"
          name="promoCode"
          type="text"
          placeholder="npr. ABCD-EFGH-IJ"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
        />

        <div style={{ marginTop: 6, fontSize: 13 }}>
          {promo.state === "idle" ? null : promo.state === "checking" ? (
            <span>Proveravam…</span>
          ) : promo.state === "valid" ? (
            <span style={{ color: "green" }}>✅ Važi: -{promo.discountPct}%</span>
          ) : (
            <span style={{ color: "crimson" }}>❌ {promo.message}</span>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa",
          maxWidth: 420,
        }}
      >
        <div>
          Subtotal: <b>{subtotal}</b> RSD
        </div>

        <div>
          10% popust: {discountActive ? <b style={{ color: "green" }}>DA</b> : <b>NE</b>}
          {discountActive && discountUntil ? (
            <span style={{ fontSize: 12, opacity: 0.75 }}> (do {formatDateSR(discountUntil)})</span>
          ) : null}
        </div>

        <div>
          Promo: {promoPct > 0 ? <b style={{ color: "green" }}>-{promoPct}%</b> : <b>0%</b>}
        </div>

        <div style={{ marginTop: 8, fontSize: 16 }}>
          Procena ukupno: <b>{estimatedTotal}</b> RSD
        </div>

        <div style={{ marginTop: 6, fontSize: 14 }}>
          {currencyCode === "RSD" ? null : fxPreview.state === "loading" ? (
            <span>Preračunavam u {currencyCode}…</span>
          ) : fxPreview.state === "ok" ? (
            <span>
              ≈ <b>{fxPreview.totalInCurrency}</b> {currencyCode}{" "}
              <span style={{ fontSize: 12, opacity: 0.7 }}>(kurs {fxPreview.fxRateUsed})</span>
            </span>
          ) : fxPreview.state === "error" ? (
            <span style={{ color: "crimson" }}>❌ {fxPreview.message}</span>
          ) : null}
        </div>
      </div>

      <button type="submit" style={{ marginTop: 16 }}>
        Rezerviši kartu
      </button>
    </form>
  );
}
