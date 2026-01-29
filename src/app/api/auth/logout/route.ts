import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;

  if (token) {
    await clearSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: env.sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
