import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

const setSessionCookie = (response: NextResponse, token: string, expiresAt: Date) => {
  response.cookies.set({
    name: env.sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { username, password } = parsed.data;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const { data: user, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash })
    .select("id, username")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user });
  setSessionCookie(response, token, expiresAt);
  return response;
}

// Login is handled by /api/auth/login.
