import { cookies } from "next/headers";

import { env } from "./env";
import { supabase } from "./db";
import { hashToken } from "./auth";

export type SessionUser = {
  id: string;
  username: string;
};

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  return getSessionUserFromToken(token);
};

export const getSessionUserFromToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !session) {
    return null;
  }

  if (session.expires_at <= now) {
    await supabase.from("sessions").delete().eq("token_hash", tokenHash);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, username")
    .eq("id", session.user_id)
    .maybeSingle();

  if (userError || !user) {
    return null;
  }

  return user as SessionUser;
};

export const clearSession = async (token: string) => {
  const tokenHash = hashToken(token);
  await supabase.from("sessions").delete().eq("token_hash", tokenHash);
};
