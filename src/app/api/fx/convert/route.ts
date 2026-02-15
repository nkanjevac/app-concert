export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFxRate } from "@/lib/fx";

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isValidCurrencyCode(code: string) {
  return /^[A-Z]{3}$/.test(code);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const amountRsdRaw = num(searchParams.get("amountRsd"));
  const to = (searchParams.get("to") ?? "RSD").trim().toUpperCase();

  if (amountRsdRaw == null || amountRsdRaw < 0) {
    return NextResponse.json({ ok: false, error: "Neispravan amountRsd." }, { status: 400 });
  }

  const amountRsd = Number(amountRsdRaw.toFixed(2));

  if (!isValidCurrencyCode(to)) {
    return NextResponse.json({ ok: false, error: "Neispravna valuta." }, { status: 400 });
  }

  if (to === "RSD") {
    return NextResponse.json({ ok: true, fxRateUsed: 1, totalInCurrency: amountRsd });
  }

  try {
    const fxRateUsed = await getFxRate("RSD", to);
    const totalInCurrency = Number((amountRsd * fxRateUsed).toFixed(2));
    return NextResponse.json({ ok: true, fxRateUsed, totalInCurrency });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Ne mogu da izračunam kurs." },
      { status: 502 }
    );
  }
}
