import bcrypt from "bcryptjs";
import crypto from "crypto";

import { env } from "./env";
import { supabase } from "./db";

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const verifyPassword = async (password: string, hash: string) => bcrypt.compare(password, hash);

export const generateSessionToken = () => crypto.randomBytes(32).toString("hex");

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.sessionDays * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return { token, expiresAt };
};
