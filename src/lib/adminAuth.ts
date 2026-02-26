import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const admin = cookieStore.get("admin")?.value;

  if (admin !== "true") {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  return null; 
}