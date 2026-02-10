export const runtime = "nodejs";

type ErApiResp = {
  result: "success" | "error";
  base_code: string;
  rates: Record<string, number>;
};

export async function getFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX API error (${res.status})`);

  const data = (await res.json()) as ErApiResp;
  if (data.result !== "success") {
    throw new Error(`FX API returned error for base ${from}`);
  }

  const rate = data.rates?.[to];
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(`FX rate missing for ${from}->${to}`);
  }

  return rate;
}
