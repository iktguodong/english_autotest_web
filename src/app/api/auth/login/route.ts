import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const { data: user } = await supabase
    .from("users")
    .select("id, username, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, username: user.username } });
  response.cookies.set({
    name: env.sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return response;
}
