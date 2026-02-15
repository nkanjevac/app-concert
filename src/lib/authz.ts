import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin";

export async function requireAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value ?? "";

  if (token !== "true") {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Nemate prava pristupa.",
    };
  }

  return { ok: true as const };
}

export async function setAdminCookie() {
  const store = await cookies();
  store.set({
    name: ADMIN_COOKIE,
    value: "true",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
