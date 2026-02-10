export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFxRate } from "@/lib/fx";

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const amountRsd = num(searchParams.get("amountRsd"));
  const toRaw = (searchParams.get("to") ?? "RSD").trim().toUpperCase();

  if (amountRsd == null || amountRsd < 0) {
    return NextResponse.json({ ok: false, error: "Neispravan amountRsd." }, { status: 400 });
  }

  if (toRaw === "RSD") {
    return NextResponse.json({ ok: true, fxRateUsed: 1, totalInCurrency: amountRsd });
  }

  try {
    const fxRateUsed = await getFxRate("RSD", toRaw);
    const totalInCurrency = Number((amountRsd * fxRateUsed).toFixed(2));
    return NextResponse.json({ ok: true, fxRateUsed, totalInCurrency });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Ne mogu da izračunam kurs." },
      { status: 502 }
    );
  }
}