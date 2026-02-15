export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const code = String(form.get("code") || "").trim();

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Admin secret nije podešen." },
      { status: 500 }
    );
  }

  if (code !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Neispravan admin kod." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, 
  });

  return res;
}

